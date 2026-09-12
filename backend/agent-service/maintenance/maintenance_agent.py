# backend/agent-service/maintenance/maintenance_agent.py
"""
Maintenance Agent
Responsibilities:
- Process TMS, SMMS, TDMS tasks and frontend requests
- Normalize maintenance parameters (criticality, urgency, overdue, failure probability)
- Evaluate asset condition and required block duration dynamically per track segment
"""
import re

class MaintenanceAgent:
    VERSION = "maintenance-rules@2.0.0"

    def analyze(self, raw_request: dict) -> dict:
        task_id = raw_request.get("taskId") or raw_request.get("requestId") or "MT-1001"
        track_id = (raw_request.get("trackId") or "KA-T-000342").upper()
        department = (raw_request.get("department") or "ENGINEERING").upper()
        asset_type = (raw_request.get("assetType") or "TRACK").upper()

        # Extract track numeric index to produce track-specific condition data if not supplied
        num_match = re.search(r'\d+', track_id)
        track_num = int(num_match.group()) if num_match else 342

        criticality = raw_request.get("criticality")
        if criticality is None:
            criticality = 45 + ((track_num * 17) % 50) # 45-94
        criticality = int(criticality)

        urgency = raw_request.get("urgency")
        if urgency is None:
            urgency = 40 + ((track_num * 23) % 55) # 40-94
        urgency = int(urgency)

        failure_prob = raw_request.get("failureProbability")
        if failure_prob is None:
            failure_prob = 30 + ((track_num * 19) % 60) # 30-89
        failure_prob = int(failure_prob)

        overdue_days = raw_request.get("overdueDays")
        if overdue_days is None:
            overdue_days = (track_num * 11) % 21 # 0-20 days
        overdue_days = int(overdue_days)

        duration = int(raw_request.get("durationMinutes") or raw_request.get("estimatedDurationMinutes") or 90)

        # Asset condition and safety scores
        safety_score = 95 if (overdue_days > 7 or failure_prob > 60) else (70 + (track_num % 20))

        normalized_task = {
            "taskId": task_id,
            "trackId": track_id,
            "department": department,
            "assetType": asset_type,
            "durationMinutes": duration,
            "requestedStartTime": raw_request.get("startTime") or "19:00",
            "requestedEndTime": raw_request.get("endTime") or "20:30",
            "criticality": min(max(criticality, 0), 100),
            "urgency": min(max(urgency, 0), 100),
            "failureProbability": min(max(failure_prob, 0), 100),
            "overdueDays": max(overdue_days, 0),
            "overdueScore": min(overdue_days * 5, 100),
            "safetyScore": min(max(safety_score, 0), 100),
            "requiresBlock": True,
        }
        return normalized_task
