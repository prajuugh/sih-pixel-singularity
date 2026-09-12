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
    _reroute_cache = {}

    def __init__(self):
        self.last_schedule_source = "UNKNOWN"
        self.last_schedule_authoritative = False
        self.graph, self.track_coordinates = self._load_track_network()

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
        if source_path:
            with source_path.open(encoding="utf-8") as source:
                collection = json.load(source)
            for feature in collection.get("features", []):
                track_id = feature.get("properties", {}).get("track_id")
                coordinates = feature.get("geometry", {}).get("coordinates", [])
                if not track_id or len(coordinates) < 2:
                    continue
                track_coordinates[track_id] = coordinates
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
        return graph, track_coordinates

    def find_available_reroute(self, blocked_track_id: str):
        """Return a route made exclusively from GeoJSON railway edges, or None."""
        if blocked_track_id in self._reroute_cache:
            return self._reroute_cache[blocked_track_id]
        blocked_coordinates = self.track_coordinates.get(blocked_track_id)
        if not blocked_coordinates or self.graph.number_of_edges() == 0:
            self._reroute_cache[blocked_track_id] = None
            return None

        start = self._node(blocked_coordinates[0])
        end = self._node(blocked_coordinates[-1])
        base_distance = sum(
            self._distance_km(self._node(first), self._node(second))
            for first, second in zip(blocked_coordinates, blocked_coordinates[1:])
        )
        available_graph = nx.subgraph_view(
            self.graph,
            filter_edge=lambda first, second, key: self.graph[first][second][key].get("trackId") != blocked_track_id,
        )
        try:
            path = nx.shortest_path(available_graph, start, end, weight="weight")
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            self._reroute_cache[blocked_track_id] = None
            return None

        route_distance = 0.0
        route_track_ids = []
        for first, second in zip(path, path[1:]):
            candidates = [
                data for data in self.graph[first][second].values()
                if data.get("trackId") != blocked_track_id
            ]
            if not candidates:
                self._reroute_cache[blocked_track_id] = None
                return None
            edge = min(candidates, key=lambda data: data.get("weight", float("inf")))
            route_distance += edge["weight"]
            if not route_track_ids or route_track_ids[-1] != edge["trackId"]:
                route_track_ids.append(edge["trackId"])

        # Reject geographically connected but operationally implausible network walks.
        if route_distance > base_distance + max(50.0, base_distance * 1.5):
            self._reroute_cache[blocked_track_id] = None
            return None

        route = {
            "type": "LineString",
            "coordinates": [list(node) for node in path],
            "source": "OSM_RAIL_NETWORK",
            "trackIds": route_track_ids,
            "distanceKm": round(route_distance, 1),
            "extraDistanceKm": round(max(0.0, route_distance - base_distance), 1),
        }
        self._reroute_cache[blocked_track_id] = route
        return route

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

    def analyze_traffic(self, track_id: str, start_time: str, end_time: str, schedules: list = None) -> dict:
        # Get actual schedules for this specific track unless a consistent snapshot was supplied.
        scheduled_trains = schedules if schedules is not None else self.fetch_track_schedules(track_id)
        conflicts = self._find_conflicts(scheduled_trains, start_time, end_time)

        # A reroute is feasible only when a connected path exists in the loaded
        # railway GeoJSON after every edge of the blocked track is removed.
        reroute = self.find_available_reroute(track_id)
        reroute_feasible = reroute is not None
        reroute_details = (
            f"Available via {len(reroute['trackIds'])} track segment(s) (+{reroute['extraDistanceKm']} km)"
            if reroute else "No connected alternate railway path found"
        )

        return {
            "trackId": track_id,
            "hasConflict": len(conflicts) > 0,
            "conflicts": conflicts,
            "allSchedules": scheduled_trains,
            "rerouteFeasible": reroute_feasible,
            "rerouteDetails": reroute_details,
            "reroute": reroute,
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
