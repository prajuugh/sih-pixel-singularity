# backend/agent-service/orchestrator/orchestrator_agent.py
"""
Orchestrator Agent
Responsibilities:
- Controls end-to-end multi-agent execution pipeline
- Invokes Maintenance Agent, Traffic Agent, and Block Planner Agent
- Aggregates structured data and returns final planning response
"""
from maintenance.maintenance_agent import MaintenanceAgent
from traffic.traffic_agent import TrafficAgent
from block_planner.block_planner_agent import BlockPlannerAgent

class OrchestratorAgent:
    def __init__(self):
        self.maintenance_agent = MaintenanceAgent()
        self.traffic_agent = TrafficAgent()
        self.block_planner_agent = BlockPlannerAgent()

    def process_plan(self, payload: dict) -> dict:
        track_id = payload.get("trackId") or "KA-T-000342"
        date = payload.get("planningDate") or "2026-09-15"
        start_time = payload.get("startTime") or "19:00"
        end_time = payload.get("endTime") or "20:30"

        # Step 1: Maintenance Agent analysis
        maint_data = self.maintenance_agent.analyze(payload)

        # Step 2: Traffic Agent analysis
        traffic_data = self.traffic_agent.analyze_traffic(track_id, start_time, end_time)

        # Step 3: Block Planner Agent optimization & alternatives
        prohibited_start = payload.get("prohibitedStartTime")
        prohibited_end = payload.get("prohibitedEndTime")
        plan_result = self.block_planner_agent.generate_plan(
            maint_data,
            traffic_data,
            date,
            prohibited_start=prohibited_start,
            prohibited_end=prohibited_end
        )
        plan_result["requestId"] = payload.get("requestId") or payload.get("taskId")

        return plan_result
