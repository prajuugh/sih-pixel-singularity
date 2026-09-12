# backend/agent-service/block_planner/block_planner_agent.py
"""
Block Planner Agent
Responsibilities:
- MCDA Priority Score calculation (Safety 20%, Criticality 20%, Urgency 15%, Overdue 15%, Failure Prob 10%, Asset Avail 10%, Train Impact 10%)
- Task Grouping (Combining Engineering, Traction, S&T into single common blocks)
- Feasible window search & Optimization based on real track traffic
- Alternative Evaluation (RESCHEDULE, DELAY, REROUTE, DIRECT CLEARANCE)
- Ranking & Explainability
"""
from datetime import date as date_type, timedelta


def time_to_minutes(time_str: str) -> int:
    if not time_str:
        return 0
    parts = time_str.split(":")
    return int(parts[0]) * 60 + int(parts[1])

def minutes_to_time(total_min: int) -> str:
    norm = ((total_min % 1440) + 1440) % 1440
    h = str(norm // 60).zfill(2)
    m = str(norm % 60).zfill(2)
    return f"{h}:{m}"


def date_with_offset(value: str, day_offset: int = 0) -> str:
    try:
        return (date_type.fromisoformat(value) + timedelta(days=day_offset)).isoformat()
    except (TypeError, ValueError):
        return value

class BlockPlannerAgent:
    VERSION = "block-planner@2.1.0"

    def __init__(self):
        # Initial expert-defined MCDA weights (PRD Section 33)
        self.weights = {
            "safety": 0.20,
            "criticality": 0.20,
            "urgency": 0.15,
            "overdue": 0.15,
            "failureProbability": 0.10,
            "assetAvailability": 0.10,
            "trainImpact": 0.10,
        }

    def calculate_priority_score(self, maintenance_info: dict, traffic_info: dict) -> dict:
        safety = maintenance_info.get("safetyScore", 85)
        criticality = maintenance_info.get("criticality", 80)
        urgency = maintenance_info.get("urgency", 75)
        overdue = maintenance_info.get("overdueScore", 60)
        failure_prob = maintenance_info.get("failureProbability", 65)
        asset_avail = 80
        train_impact = 40 if traffic_info.get("hasConflict") else 95

        priority_score = int(
            self.weights["safety"] * safety +
            self.weights["criticality"] * criticality +
            self.weights["urgency"] * urgency +
            self.weights["overdue"] * overdue +
            self.weights["failureProbability"] * failure_prob +
            self.weights["assetAvailability"] * asset_avail +
            self.weights["trainImpact"] * train_impact
        )

        return {
            "priorityScore": min(max(priority_score, 0), 100),
            "breakdown": {
                "safety": safety,
                "criticality": criticality,
                "urgency": urgency,
                "overdue": overdue,
                "failureProbability": failure_prob,
                "assetAvailability": asset_avail,
                "trainImpact": train_impact,
            }
        }

    def generate_plan(
        self,
        maintenance_info: dict,
        traffic_info: dict,
        date: str,
        prohibited_start: str = None,
        prohibited_end: str = None,
        feasible_windows: list = None,
    ) -> dict:
        priority_res = self.calculate_priority_score(maintenance_info, traffic_info)
        p_score = priority_res["priorityScore"]
        has_conflict = traffic_info.get("hasConflict", False)
        conflicts = traffic_info.get("conflicts", [])
        track_id = maintenance_info.get("trackId", "KA-T-000342")
        duration = maintenance_info.get("durationMinutes", 90)
        reroute = traffic_info.get("reroute") if traffic_info.get("rerouteFeasible") else None

        alternatives = []

        # If Officer designated a Prohibited Window (block CANNOT be planned in this window)
        if prohibited_start and prohibited_end:
            feasible_windows = feasible_windows or []
            if not feasible_windows:
                return {
                    "priorityScore": p_score,
                    "breakdown": priority_res["breakdown"],
                    "conflict": True,
                    "conflictingTrains": traffic_info.get("conflicts", []),
                    "recommendedBlock": None,
                    "alternatives": [],
                    "explanation": "No conflict-free block window was found within the 24-hour search horizon.",
                    "prohibitedWindow": {"startTime": prohibited_start, "endTime": prohibited_end},
                }

            primary = feasible_windows[0]
            rev_start = primary["startTime"]
            rev_end = primary["endTime"]

            rec_window = {
                "date": date_with_offset(date, primary.get("dayOffset", 0)),
                "startTime": rev_start,
                "endTime": rev_end,
                "trackId": track_id,
                "priorityScore": min(p_score + 5, 100),
                "isRevised": True,
                "dayOffset": primary.get("dayOffset", 0),
                "prohibitedWindow": {
                    "startTime": prohibited_start,
                    "endTime": prohibited_end,
                }
            }

            alternatives.append({
                "id": 1,
                "type": "RESCHEDULE",
                "description": f"Revised block window to {rev_start}-{rev_end} strictly avoiding Officer prohibited blackout ({prohibited_start}-{prohibited_end}).",
                "feasible": True,
                "trainImpact": "Zero train conflict (Post-restriction corridor clearance)",
                "delayMinutes": 0,
                "operationalCost": 0.00,
                "priorityScore": min(p_score + 5, 100),
                "rank": 1,
            })

            for rank, candidate in enumerate(feasible_windows[1:3], start=2):
                alternatives.append({
                    "id": rank,
                    "type": "RESCHEDULE",
                    "description": f"Verified clear window {candidate['startTime']}-{candidate['endTime']} (candidate {rank}).",
                    "feasible": True,
                    "trainImpact": "No timetable overlap detected",
                    "delayMinutes": 0,
                    "operationalCost": float((rank - 1) * 150),
                    "priorityScore": max(p_score + 6 - rank, 40),
                    "rank": rank,
                    "dayOffset": candidate.get("dayOffset", 0),
                })

            explanation = (
                f"Block Plan Revised by Traffic Officer: Corridor possession strictly prohibited during {prohibited_start}-{prohibited_end}. "
                f"The traffic agent verified the revised {rev_start}-{rev_end} window ({duration} minutes) against the current timetable snapshot."
            )

            return {
                "priorityScore": min(p_score + 5, 100),
                "breakdown": {
                    **priority_res["breakdown"],
                    "trainImpact": 95,
                },
                "conflict": False,
                "conflictingTrains": [],
                "recommendedBlock": rec_window,
                "alternatives": alternatives,
                "explanation": explanation,
                "prohibitedWindow": {
                    "startTime": prohibited_start,
                    "endTime": prohibited_end,
                }
            }

        if has_conflict:
            selected_day_offset = 0
            if feasible_windows:
                selected_window = feasible_windows[0]
                resched_start = selected_window["startTime"]
                resched_end = selected_window["endTime"]
                selected_day_offset = selected_window.get("dayOffset", 0)
            else:
                # This legacy fallback will be vetoed if a later movement also occupies it.
                latest_dep = max(time_to_minutes(c.get("departure", "20:30")) for c in conflicts)
                new_start_min = latest_dep + 10
                new_end_min = new_start_min + duration
                resched_start = minutes_to_time(new_start_min)
                resched_end = minutes_to_time(new_end_min)

            conflict_names = ", ".join([f"{c.get('trainName', 'Train')} ({c.get('trainNo')})" for c in conflicts])

            # 1. Alternative 1: RESCHEDULE window (Recommended)
            alternatives.append({
                "id": 1,
                "type": "RESCHEDULE",
                "description": f"Reschedule window to {resched_start}-{resched_end} after {conflict_names} passage.",
                "feasible": True,
                "trainImpact": "Zero train delays (Passenger schedule preserved)",
                "delayMinutes": 0,
                "operationalCost": 0.00,
                "priorityScore": min(p_score + 6, 100),
                "rank": 1,
            })

            # 2. Alternative 2: REGULATE / DELAY freight or trailing train
            freight_conflict = next((c for c in conflicts if c.get("type") == "GOODS"), None)
            target_delay_train = freight_conflict.get("trainName") if freight_conflict else conflicts[0].get("trainName")
            target_delay_no = freight_conflict.get("trainNo") if freight_conflict else conflicts[0].get("trainNo")

            alternatives.append({
                "id": 2,
                "type": "DELAY",
                "description": f"Regulate {target_delay_train} ({target_delay_no}) at preceding loop siding for 20 minutes.",
                "feasible": True,
                "trainImpact": "20 min regulation delay",
                "delayMinutes": 20,
                "operationalCost": 600.00,
                "priorityScore": max(p_score - 8, 30),
                "rank": 2,
            })

            # 3. REROUTE is offered only when the traffic agent found a
            # connected path made from available railway GeoJSON edges.
            if reroute:
                extra_km = reroute["extraDistanceKm"]
                delay_minutes = max(5, round(extra_km / 45 * 60))
                alternatives.append({
                    "id": 3,
                    "type": "REROUTE",
                    "description": f"Reroute via {len(reroute['trackIds'])} available railway track segment(s).",
                    "feasible": True,
                    "trainImpact": f"Detour +{extra_km} km (+{delay_minutes} min estimated transit time)",
                    "delayMinutes": delay_minutes,
                    "operationalCost": round(300 + extra_km * 45, 2),
                    "priorityScore": max(p_score - 14, 25),
                    "rank": 3,
                    "routeGeometry": reroute,
                    "routeTrackIds": reroute["trackIds"],
                })

            rec_window = {
                "date": date_with_offset(date, selected_day_offset),
                "startTime": resched_start,
                "endTime": resched_end,
                "trackId": track_id,
                "priorityScore": p_score,
                "dayOffset": selected_day_offset,
            }
            explanation = (
                f"MCDA Priority Score: {p_score}/100. Conflict detected with {conflict_names}. "
                f"Recommended shift to {resched_start}-{resched_end} avoids train deceleration and guarantees safety buffer."
            )
        else:
            # NO CONFLICT DETECTED FOR THIS TRACK!
            req_start = maintenance_info.get("requestedStartTime") or maintenance_info.get("startTime", "19:00")
            req_end = maintenance_info.get("requestedEndTime") or maintenance_info.get("endTime", "20:30")
            rec_window = {"date": date, "startTime": req_start, "endTime": req_end, "trackId": track_id, "priorityScore": p_score}

            # If there are NO trains scheduled/clashing, no REROUTE or DELAY options are needed
            alternatives.append({
                "id": 1,
                "type": "DIRECT_CLEARANCE",
                "description": f"Direct clearance on {track_id}: Requested window {req_start}-{req_end} is completely clear of train traffic.",
                "feasible": True,
                "trainImpact": "Zero train conflict (Free corridor slot)",
                "delayMinutes": 0,
                "operationalCost": 0.00,
                "priorityScore": min(p_score + 10, 100),
                "rank": 1,
            })
            explanation = (
                f"MCDA Priority Score: {p_score}/100. Clear corridor window on {track_id}. "
                f"Direct maintenance clearance sanctioned with zero train conflicts or clashing timetables."
            )

        return {
            "priorityScore": p_score,
            "breakdown": priority_res["breakdown"],
            "conflict": has_conflict,
            "conflictingTrains": conflicts,
            "recommendedBlock": rec_window,
            "alternatives": alternatives,
            "explanation": explanation,
        }
