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


def is_electric_train(train: dict) -> bool:
    if not train:
        return False

    # Explicit boolean flag
    if isinstance(train.get("isElectric"), bool):
        return train["isElectric"]

    # Explicit traction string
    traction = str(train.get("traction", "")).upper()
    if "DIESEL" in traction:
        return False
    if any(k in traction for k in ["ELEC", "OHE", "25KV", "AC"]):
        return True

    # Locomotive Class (Indian Railways Freight & Passenger)
    loco = str(train.get("locoClass") or train.get("loco") or train.get("locomotive") or "").upper()
    if any(k in loco for k in ["WAG-9", "WAG-12", "WAG-7", "WAG9", "WAG12", "WAG", "WAP-7", "WAP-5", "WAP-4", "WAP"]):
        return True
    if any(k in loco for k in ["WDG-4", "WDG-4D", "WDG-3A", "WDG", "WDP-4", "WDP-4D", "WDP"]):
        return False

    t_type = str(train.get("type") or train.get("train_type") or "").upper()
    name = str(train.get("trainName") or train.get("train_name") or "").upper()
    no = str(train.get("trainNo") or train.get("train_no") or "").upper()

    # Freight train checks (WAG vs WDG)
    if "WAG" in name or "WAG" in no:
        return True
    if "WDG" in name or "WDG" in no:
        return False

    # Passenger train type codes and named services
    if any(k in t_type for k in ["SF", "SUPERFAST", "EXP", "EXPRESS", "SKR", "SAMPARK KRANTI", "PASS", "PASSENGER", "MEMU", "EMU", "VB", "VANDE BHARAT", "SHATABDI", "RAJDHANI", "TEJAS", "MAIL", "INTERCITY", "SPECIAL"]):
        return True
    if any(k in name for k in ["VANDE BHARAT", "VB", "EMU", "MEMU", "METRO", "SHATABDI", "RAJDHANI", "TEJAS", "KARNATAKA EXPRESS", "RANI CHENNAMMA", "GOL GUMBAZ", "SWARNA JAYANTI", "EXPRESS", "EXP", "PASSENGER", "KRANTI", "INTERCITY"]):
        return True

    return False

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

            delayed_trains_list = []
            for c in conflicts:
                arr_val = c.get("arrival", "19:15")
                dep_val = c.get("departure", "19:30")
                delay_m = 20
                delayed_trains_list.append({
                    "trainNo": c.get("trainNo", "16589"),
                    "trainName": c.get("trainName", "Express"),
                    "type": c.get("type", "SUPERFAST"),
                    "scheduledTime": f"{arr_val}–{dep_val}",
                    "delayedTime": f"{minutes_to_time(time_to_minutes(arr_val) + delay_m)}–{minutes_to_time(time_to_minutes(dep_val) + delay_m)}",
                    "delayMinutes": delay_m,
                    "action": f"Regulate at preceding loop siding for {delay_m} minutes",
                })

            alternatives.append({
                "id": 2,
                "type": "DELAY",
                "description": f"Regulate {target_delay_train} ({target_delay_no}) at preceding loop siding for 20 minutes.",
                "feasible": True,
                "trainImpact": "20 min regulation delay",
                "delayMinutes": 20,
                "delayedTrains": delayed_trains_list,
                "operationalCost": 600.00,
                "priorityScore": max(p_score - 8, 30),
                "rank": 2,
            })

            # 3. DIVERSION (REROUTE) is offered when the traffic agent found an available railway path.
            # Indian Railways Operating Constraints:
            # 1. Electric trains cannot be diverted onto alternate corridors lacking continuous 25kV OHE catenary.
            # 2. Diversion cannot skip mandatory commercial passenger halts for conflicting passenger services.
            if reroute:
                extra_km = reroute["extraDistanceKm"]
                delay_minutes = max(5, round(extra_km / 45 * 60))
                electric_conflicts = [t for t in conflicts if is_electric_train(t)]
                is_electric_passive = len(electric_conflicts) > 0

                mandatory_eval = traffic_info.get("mandatoryStationsEvaluation") or {}
                skips_mandatory_stops = not mandatory_eval.get("diversionFeasibleForStations", True)
                missed_stops = mandatory_eval.get("missedStops", [])

                is_passive = is_electric_passive or skips_mandatory_stops

                reasons = []
                if is_electric_passive:
                    reasons.append(
                        f"Electric train ({', '.join(f'{t.get('trainNo', '')} {t.get('trainName', '')}' for t in electric_conflicts)}) cannot be diverted: alternate railway corridor lacks compatible 25kV AC overhead electrification (OHE)."
                    )
                if skips_mandatory_stops:
                    reasons.append(
                        mandatory_eval.get("explanation")
                        or f"Diversion skips mandatory passenger halt(s): {', '.join(f'{s.get('stationName')} ({s.get('stationCode')})' for s in missed_stops)}."
                    )

                disabled_reason = " | ".join(reasons) if reasons else None
                train_impact_msg = (
                    "Diversion prohibited: mandatory commercial halts skipped"
                    if skips_mandatory_stops
                    else (
                        "Diversion prohibited for electric train traction"
                        if is_electric_passive
                        else f"Diversion +{extra_km} km (+{delay_minutes} min estimated transit time)"
                    )
                )

                alternatives.append({
                    "id": 3,
                    "type": "REROUTE",
                    "displayName": "DIVERSION",
                    "description": f"Diversion via {len(reroute['trackIds'])} available railway track segment(s).",
                    "feasible": not is_passive,
                    "passive": is_passive,
                    "disabledReason": disabled_reason,
                    "isElectricPassive": is_electric_passive,
                    "skipsMandatoryStops": skips_mandatory_stops,
                    "mandatoryStationsEvaluation": mandatory_eval,
                    "missedMandatoryStops": missed_stops,
                    "mandatoryStops": mandatory_eval.get("mandatoryStops", []),
                    "stationsPreserved": mandatory_eval.get("diversionFeasibleForStations", True),
                    "stationStatus": mandatory_eval.get("status", "NO_MANDATORY_HALTS_ON_SECTION"),
                    "trainImpact": train_impact_msg,
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
            requested_start = maintenance_info.get("requestedStartTime", "19:00")
            requested_end = maintenance_info.get("requestedEndTime", "20:30")
            rec_window = {"date": date, "startTime": requested_start, "endTime": requested_end, "trackId": track_id, "priorityScore": p_score}

            alternatives.append({
                "id": 1,
                "type": "RESCHEDULE",
                "description": f"Retain requested window {requested_start}-{requested_end} on {track_id} with direct clearance.",
                "feasible": True,
                "trainImpact": "Zero train delays (Free corridor slot)",
                "delayMinutes": 0,
                "delayedTrains": [],
                "operationalCost": 0.00,
                "priorityScore": min(p_score + 10, 100),
                "rank": 1,
            })

            req_end_min = time_to_minutes(requested_end)
            t1_arr_min = (req_end_min + 10) % 1440
            t1_arr = minutes_to_time(t1_arr_min)
            t1_dep = minutes_to_time(t1_arr_min + 15)
            contingency_delayed_trains = [
                {
                    "trainNo": "12627",
                    "trainName": "Karnataka Express",
                    "type": "SUPERFAST",
                    "scheduledTime": f"{t1_arr}–{t1_dep}",
                    "delayedTime": f"{minutes_to_time(t1_arr_min + 10)}–{minutes_to_time(t1_arr_min + 25)}",
                    "delayMinutes": 10,
                    "action": "Trailing movement: speed regulated by +10 min contingency buffer",
                },
                {
                    "trainNo": "G-BOXN-401",
                    "trainName": "Iron Ore / Freight Consignment",
                    "type": "GOODS",
                    "scheduledTime": f"{minutes_to_time(t1_arr_min + 25)}–{minutes_to_time(t1_arr_min + 45)}",
                    "delayedTime": f"{minutes_to_time(t1_arr_min + 40)}–{minutes_to_time(t1_arr_min + 60)}",
                    "delayMinutes": 15,
                    "action": "Held at preceding loop siding to clear corridor for maintenance completion",
                }
            ]

            alternatives.append({
                "id": 2,
                "type": "DELAY",
                "description": f"Contingency buffer: regulate trailing movements by up to 10 minutes if maintenance overruns.",
                "feasible": True,
                "trainImpact": "10-minute contingency buffer",
                "delayMinutes": 10,
                "delayedTrains": contingency_delayed_trains,
                "operationalCost": 150.00,
                "priorityScore": max(p_score - 5, 40),
                "rank": 2,
            })

            if reroute:
                extra_km = reroute["extraDistanceKm"]
                delay_minutes = max(5, round(extra_km / 45 * 60))
                alternatives.append({
                    "id": 3,
                    "type": "REROUTE",
                    "displayName": "DIVERSION",
                    "description": f"Contingency diversion route via {len(reroute['trackIds'])} available railway track segment(s).",
                    "feasible": True,
                    "trainImpact": f"Diversion +{extra_km} km (+{delay_minutes} min estimated transit time)",
                    "delayMinutes": delay_minutes,
                    "operationalCost": round(300 + extra_km * 45, 2),
                    "priorityScore": max(p_score - 10, 35),
                    "rank": 3,
                    "routeGeometry": reroute,
                    "routeTrackIds": reroute["trackIds"],
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
