# backend/agent-service/traffic/traffic_agent.py
"""
Traffic Agent
Responsibilities:
- Analyze train timetables and route segments for specific track
- Detect track occupancy overlaps with real train schedules
- Process Goods train forecasts
- Compute graph rerouting alternatives via networkx topology
- Evaluate train delay impact dynamically
"""
import urllib.request
import json
import math
import os
from pathlib import Path
import networkx as nx
from traffic.mandatory_stations import mandatory_engine

def time_to_minutes(time_str: str) -> int:
    if not time_str or not isinstance(time_str, str):
        raise ValueError("Time is required in HH:MM format")
    parts = time_str.split(":")
    if len(parts) != 2:
        raise ValueError(f"Invalid time: {time_str}")
    hour, minute = (int(part) for part in parts)
    if not 0 <= hour <= 23 or not 0 <= minute <= 59:
        raise ValueError(f"Invalid time: {time_str}")
    return hour * 60 + minute


def minutes_to_time(total_min: int) -> str:
    normalized = total_min % 1440
    return f"{normalized // 60:02d}:{normalized % 60:02d}"


def normalize_interval(start_time: str, end_time: str) -> tuple[int, int]:
    start = time_to_minutes(start_time)
    end = time_to_minutes(end_time)
    if end == start:
        raise ValueError("Start and end times cannot be equal")
    if end < start:
        end += 1440
    return start, end


def overlaps(first: tuple[int, int], second: tuple[int, int]) -> bool:
    # Compare adjacent-day copies so overnight requests and services work.
    return any(
        first[0] < second[1] + shift and second[0] + shift < first[1]
        for shift in (-1440, 0, 1440)
    )

class TrafficAgent:
    VERSION = "traffic-rules@2.1.0"
    _network_graph = None
    _track_coordinates = None
    _track_names = None
    _reroute_cache = {}

    def __init__(self):
        self.last_schedule_source = "UNKNOWN"
        self.last_schedule_authoritative = False
        self.graph, self.track_coordinates = self._load_track_network()
        self.track_names = self._track_names or {}

    @staticmethod
    def _node(coordinate):
        return round(float(coordinate[0]), 6), round(float(coordinate[1]), 6)

    @staticmethod
    def _distance_km(first, second):
        lat1 = math.radians(first[1])
        lat2 = math.radians(second[1])
        delta_lat = lat2 - lat1
        delta_lon = math.radians(second[0] - first[0])
        value = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
        return 6371 * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))

    @classmethod
    def _load_track_network(cls):
        if cls._network_graph is not None:
            return cls._network_graph, cls._track_coordinates

        configured_path = os.getenv("RAILWAY_TRACKS_GEOJSON")
        candidates = [
            Path(configured_path) if configured_path else None,
            Path(__file__).resolve().parents[2] / "data" / "karnataka_tracks.geojson",
            Path("/app/data/karnataka_tracks.geojson"),
        ]
        source_path = next((path for path in candidates if path and path.exists()), None)
        graph = nx.MultiGraph()
        track_coordinates = {}
        track_names = {}
        if source_path:
            with source_path.open(encoding="utf-8") as source:
                collection = json.load(source)
            for feature in collection.get("features", []):
                props = feature.get("properties", {})
                track_id = props.get("track_id")
                name = props.get("name")
                coordinates = feature.get("geometry", {}).get("coordinates", [])
                if not track_id or len(coordinates) < 2:
                    continue
                track_coordinates[track_id] = coordinates
                if name:
                    track_names[track_id] = name
                for index, (first, second) in enumerate(zip(coordinates, coordinates[1:])):
                    start = cls._node(first)
                    end = cls._node(second)
                    graph.add_edge(
                        start,
                        end,
                        key=f"{track_id}:{index}",
                        weight=cls._distance_km(start, end),
                        trackId=track_id,
                    )

        cls._network_graph = graph
        cls._track_coordinates = track_coordinates
        cls._track_names = track_names
        return graph, track_coordinates

    def find_available_reroute(self, blocked_track_id: str, blocked_track_ids: list = None):
        """Return a route made exclusively from GeoJSON railway edges, or None."""
        blocked_set = set(blocked_track_ids) if blocked_track_ids else set()
        if blocked_track_id:
            blocked_set.add(blocked_track_id)

        cache_key = tuple(sorted(blocked_set)) if blocked_set else blocked_track_id
        if cache_key in self._reroute_cache:
            return self._reroute_cache[cache_key]

        if not blocked_set or self.graph.number_of_edges() == 0:
            self._reroute_cache[cache_key] = None
            return None

        # Check if any blocked track belongs to a named bypass line or corridor segment.
        # If so, expand blocked_set to include all segments of that named bypass line so trains don't take
        # impossible backtrack loops or run on parallel tracks of the blocked bypass.
        named_bypass = None
        for tid in list(blocked_set):
            t_name = self.track_names.get(tid)
            if t_name and ("Bypass" in t_name or len(blocked_set) > 1):
                named_bypass = t_name
                break

        if named_bypass:
            for tid, t_name in self.track_names.items():
                if t_name == named_bypass:
                    blocked_set.add(tid)

        blocked_nodes = set()
        for tid in blocked_set:
            coords = self.track_coordinates.get(tid)
            if coords:
                for c in coords:
                    blocked_nodes.add(self._node(c))

        available_graph = nx.subgraph_view(
            self.graph,
            filter_edge=lambda first, second, key: self.graph[first][second][key].get("trackId") not in blocked_set,
        )

        gateways = [n for n in blocked_nodes if n in available_graph and available_graph.degree(n) > 0]
        if not gateways:
            self._reroute_cache[cache_key] = None
            return None

        ref_coords = self.track_coordinates.get(blocked_track_id) or next(
            (self.track_coordinates[t] for t in blocked_set if t in self.track_coordinates), None
        )
        if not ref_coords:
            self._reroute_cache[cache_key] = None
            return None

        orig_start = self._node(ref_coords[0])
        orig_end = self._node(ref_coords[-1])

        if orig_start in gateways:
            start = orig_start
        else:
            start = min(gateways, key=lambda g: self._distance_km(orig_start, g))

        candidates = sorted([g for g in gateways if g != start], key=lambda g: self._distance_km(start, g), reverse=True)
        if len(blocked_set) == 1 and orig_end in candidates and not named_bypass:
            candidates.remove(orig_end)
            candidates.insert(0, orig_end)

        base_distance = sum(
            self._distance_km(self._node(first), self._node(second))
            for first, second in zip(ref_coords, ref_coords[1:])
        )
        if len(blocked_set) > 1:
            base_distance = max(
                base_distance,
                sum(
                    sum(self._distance_km(self._node(a), self._node(b)) for a, b in zip(self.track_coordinates[tid], self.track_coordinates[tid][1:]))
                    for tid in blocked_set if tid in self.track_coordinates
                ) / 2
            )

        best_route = None
        for end in candidates:
            try:
                path = nx.shortest_path(available_graph, start, end, weight="weight")
            except (nx.NetworkXNoPath, nx.NodeNotFound):
                continue

            route_distance = 0.0
            route_track_ids = []
            edge_failed = False
            for first, second in zip(path, path[1:]):
                candidate_edges = [
                    data for data in available_graph[first][second].values()
                    if data.get("trackId") not in blocked_set
                ]
                if not candidate_edges:
                    edge_failed = True
                    break
                edge = min(candidate_edges, key=lambda data: data.get("weight", float("inf")))
                route_distance += edge["weight"]
                if not route_track_ids or route_track_ids[-1] != edge["trackId"]:
                    route_track_ids.append(edge["trackId"])

            if edge_failed:
                continue

            if route_distance > base_distance + max(50.0, base_distance * 2.0):
                continue

            best_route = {
                "type": "LineString",
                "coordinates": [list(node) for node in path],
                "source": "OSM_RAIL_NETWORK",
                "trackIds": route_track_ids,
                "distanceKm": round(route_distance, 1),
                "extraDistanceKm": round(max(0.0, route_distance - base_distance), 1),
            }
            break

        self._reroute_cache[cache_key] = best_route
        if blocked_track_id and cache_key != blocked_track_id:
            self._reroute_cache[blocked_track_id] = best_route
        return best_route

    def fetch_track_schedules(self, track_id: str) -> list:
        url = f"http://localhost:5000/api/tracks/{track_id}/schedule"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "TrafficAgent/1.0"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                self.last_schedule_source = "NODE_TIMETABLE_API"
                self.last_schedule_authoritative = True
                return data.get("schedules", [])
        except Exception as e:
            # Fallback if node server not reachable
            self.last_schedule_source = "FALLBACK_FIXTURE"
            self.last_schedule_authoritative = False
            return [
                {"trainNo": "16589", "trainName": "Rani Chennamma Express", "arrival": "19:15", "departure": "19:22", "type": "SUPERFAST"},
                {"trainNo": "G-BOXN-401", "trainName": "Iron Ore Freight", "arrival": "20:00", "departure": "20:12", "type": "GOODS"},
            ]

    def _find_conflicts(self, scheduled_trains: list, start_time: str, end_time: str) -> list:
        requested = normalize_interval(start_time, end_time)
        conflicts = []
        for train in scheduled_trains:
            try:
                movement = normalize_interval(train.get("arrival"), train.get("departure"))
            except (TypeError, ValueError):
                continue
            if overlaps(requested, movement):
                conflicts.append(train)
        return conflicts

    def analyze_traffic(
        self,
        track_id: str,
        start_time: str,
        end_time: str,
        schedules: list = None,
        blocked_track_ids: list = None,
    ) -> dict:
        # Get actual schedules for this specific track unless a consistent snapshot was supplied.
        scheduled_trains = schedules if schedules is not None else self.fetch_track_schedules(track_id)
        conflicts = self._find_conflicts(scheduled_trains, start_time, end_time)

        # A reroute is feasible only when a connected path exists in the loaded
        # railway GeoJSON after every edge of the blocked track is removed.
        reroute = self.find_available_reroute(track_id, blocked_track_ids=blocked_track_ids)
        reroute_feasible = reroute is not None
        reroute_details = (
            f"Available via {len(reroute['trackIds'])} track segment(s) (+{reroute['extraDistanceKm']} km)"
            if reroute else "No connected alternate railway path found"
        )

        # Evaluate mandatory stations and scheduled commercial halts for conflicting passenger services
        effective_blocked = list(blocked_track_ids) if blocked_track_ids else ([track_id] if track_id else [])
        diversion_track_ids = reroute.get("trackIds", []) if reroute else []
        mandatory_eval = mandatory_engine.evaluate_mandatory_halts(
            conflicting_trains=conflicts,
            blocked_track_ids=effective_blocked,
            diversion_track_ids=diversion_track_ids,
        )

        return {
            "trackId": track_id,
            "hasConflict": len(conflicts) > 0,
            "conflicts": conflicts,
            "allSchedules": scheduled_trains,
            "rerouteFeasible": reroute_feasible,
            "rerouteDetails": reroute_details,
            "reroute": reroute,
            "mandatoryStationsEvaluation": mandatory_eval,
            "goodsForecastCount": 1 if any(t.get("type") == "GOODS" for t in scheduled_trains) else 0,
            "scheduleSource": self.last_schedule_source,
            "scheduleAuthoritative": self.last_schedule_authoritative,
        }

    def find_clear_windows(
        self,
        track_id: str,
        earliest_start: str,
        duration_minutes: int,
        count: int = 3,
        step_minutes: int = 15,
        search_minutes: int = 1440,
        earliest_day_offset: int = 0,
    ) -> list:
        """Search a single schedule snapshot for the next conflict-free windows."""
        if duration_minutes <= 0 or duration_minutes > 1440:
            raise ValueError("durationMinutes must be between 1 and 1440")

        schedules = self.fetch_track_schedules(track_id)
        start_min = time_to_minutes(earliest_start) + (earliest_day_offset * 1440)
        windows = []

        for offset in range(step_minutes, search_minutes + 1, step_minutes):
            candidate_start = start_min + offset
            candidate_end = candidate_start + duration_minutes
            start_time = minutes_to_time(candidate_start)
            end_time = minutes_to_time(candidate_end)
            conflicts = self._find_conflicts(schedules, start_time, end_time)
            if conflicts:
                continue
            windows.append({
                "startTime": start_time,
                "endTime": end_time,
                "dayOffset": candidate_start // 1440,
                "conflicts": [],
            })
            if len(windows) == count:
                break

        return windows
