"""Independent hard-constraint verification for proposed blocks."""

from typing import Optional


def time_to_minutes(value: Optional[str]) -> Optional[int]:
    if not value or not isinstance(value, str):
        return None
    parts = value.split(":")
    if len(parts) != 2:
        return None
    try:
        hour, minute = (int(part) for part in parts)
    except ValueError:
        return None
    if not 0 <= hour <= 23 or not 0 <= minute <= 59:
        return None
    return hour * 60 + minute


def interval(start: Optional[str], end: Optional[str]):
    start_min = time_to_minutes(start)
    end_min = time_to_minutes(end)
    if start_min is None or end_min is None or start_min == end_min:
        return None
    if end_min < start_min:
        end_min += 1440
    return start_min, end_min


def intervals_overlap(first, second) -> bool:
    if not first or not second:
        return False
    for shift in (-1440, 0, 1440):
        shifted = (second[0] + shift, second[1] + shift)
        if first[0] < shifted[1] and shifted[0] < first[1]:
            return True
    return False


class SafetyVerifierAgent:
    VERSION = "safety-rules@1.0.0"

    def verify(
        self,
        maintenance_info: dict,
        recommended_block: Optional[dict],
        recommendation_traffic: dict,
        prohibited_start: Optional[str] = None,
        prohibited_end: Optional[str] = None,
    ) -> dict:
        checked = []
        failures = []

        def check(rule_id: str, passed: bool, message: str):
            checked.append(rule_id)
            if not passed:
                failures.append({"ruleId": rule_id, "message": message, "severity": "HARD"})

        check("RECOMMENDATION_PRESENT", bool(recommended_block), "No block was proposed.")
        if not recommended_block:
            return {"passed": False, "checkedRules": checked, "failedRules": failures}

        proposed = interval(recommended_block.get("startTime"), recommended_block.get("endTime"))
        check("VALID_TIME_WINDOW", proposed is not None, "The proposed time window is malformed or has zero duration.")

        expected_duration = int(maintenance_info.get("durationMinutes") or 0)
        actual_duration = proposed[1] - proposed[0] if proposed else -1
        check(
            "REQUIRED_DURATION",
            proposed is not None and actual_duration >= expected_duration,
            f"The block provides {actual_duration} minutes; {expected_duration} are required.",
        )

        check(
            "TRACK_ID_MATCH",
            recommended_block.get("trackId") == maintenance_info.get("trackId"),
            "The proposed block is for a different track.",
        )

        check(
            "AUTHORITATIVE_TIMETABLE",
            recommendation_traffic.get("scheduleAuthoritative") is True,
            "The timetable source is unavailable or non-authoritative.",
        )

        check(
            "NO_TRACK_OCCUPANCY_OVERLAP",
            not recommendation_traffic.get("hasConflict", True),
            "The proposed block overlaps one or more scheduled train movements.",
        )

        if prohibited_start and prohibited_end:
            prohibited = interval(prohibited_start, prohibited_end)
            check(
                "NO_PROHIBITED_WINDOW_OVERLAP",
                prohibited is not None and proposed is not None and not intervals_overlap(proposed, prohibited),
                "The proposed block overlaps the officer's prohibited window.",
            )

        return {"passed": not failures, "checkedRules": checked, "failedRules": failures}
