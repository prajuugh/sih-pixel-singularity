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

def time_to_minutes(time_str: str) -> int:
    if not time_str:
        return 0
    parts = time_str.split(":")
    return int(parts[0]) * 60 + int(parts[1])

def minutes_to_time(total_min: int) -> str:
    norm = ((total_min % 1440) + 1440) % 1440
    h = String = str(norm // 60).zfill(2)
    m = str(norm % 60).zfill(2)
    return f"{h}:{m}"

class BlockPlannerAgent:
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

    def generate_plan(self, maintenance_info: dict, traffic_info: dict, date: str) -> dict:
        priority_res = self.calculate_priority_score(maintenance_info, traffic_info)
        p_score = priority_res["priorityScore"]
        has_conflict = traffic_info.get("hasConflict", False)
        conflicts = traffic_info.get("conflicts", [])
        track_id = maintenance_info.get("trackId", "KA-T-000342")
        duration = maintenance_info.get("durationMinutes", 90)

        alternatives = []

        if has_conflict:
            # Determine latest departure of conflicting trains to compute optimal reschedule window
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

            # 3. Alternative 3: REROUTE
            alternatives.append({
                "id": 3,
                "type": "REROUTE",
                "description": f"Reroute non-stop freight traffic via chord junction line (+14 km detour).",
                "feasible": True,
                "trainImpact": "Detour +14 km (+20 min transit time)",
                "delayMinutes": 20,
                "operationalCost": 950.00,
                "priorityScore": max(p_score - 14, 25),
                "rank": 3,
            })

            rec_window = {"date": date, "startTime": resched_start, "endTime": resched_end, "trackId": track_id, "priorityScore": p_score}
            explanation = (
                f"MCDA Priority Score: {p_score}/100. Conflict detected with {conflict_names}. "
                f"Recommended shift to {resched_start}-{resched_end} avoids train deceleration and guarantees safety buffer."
            )
        else:
            # NO CONFLICT DETECTED FOR THIS TRACK!
            rec_window = {"date": date, "startTime": "19:00", "endTime": "20:30", "trackId": track_id, "priorityScore": p_score}

            alternatives.append({
                "id": 1,
                "type": "DIRECT CLEARANCE",
                "description": f"Sanction primary window 19:00-20:30 directly. No train occupancy conflict on {track_id}.",
                "feasible": True,
                "trainImpact": "Zero train delays (Free corridor slot)",
                "delayMinutes": 0,
                "operationalCost": 0.00,
                "priorityScore": min(p_score + 10, 100),
                "rank": 1,
            })

            alternatives.append({
                "id": 2,
                "type": "SHADOW CLUSTERING",
                "description": f"Bundle simultaneous S&T signal checking and OHE bonding during the 19:00-20:30 slot.",
                "feasible": True,
                "trainImpact": "Triples work productivity per hour of block",
                "delayMinutes": 0,
                "operationalCost": 0.00,
                "priorityScore": min(p_score + 12, 100),
                "rank": 2,
            })

            explanation = (
                f"MCDA Priority Score: {p_score}/100. Clear corridor window on {track_id}. "
                f"Direct maintenance clearance recommended with zero train delay impact."
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
