# backend/agent-service/orchestrator/orchestrator_agent.py
"""Durable-style orchestration with an auditable, versioned execution trace."""

from datetime import datetime, timezone
from time import perf_counter_ns
from uuid import uuid4

from block_planner.block_planner_agent import BlockPlannerAgent
from explanation.explanation_agent import ExplanationAgent
from maintenance.maintenance_agent import MaintenanceAgent
from safety.safety_verifier_agent import SafetyVerifierAgent
from traffic.traffic_agent import TrafficAgent


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class OrchestratorAgent:
    VERSION = "orchestrator@2.0.0"

    def __init__(self):
        self.maintenance_agent = MaintenanceAgent()
        self.traffic_agent = TrafficAgent()
        self.block_planner_agent = BlockPlannerAgent()
        self.safety_verifier_agent = SafetyVerifierAgent()
        self.explanation_agent = ExplanationAgent()

    @staticmethod
    def _execute_step(
        trace: list,
        agent: str,
        implementation_version: str,
        input_artifacts: list,
        output_artifacts: list,
        evidence: list,
        operation,
        summarize,
    ):
        started_at = utc_now()
        started_ns = perf_counter_ns()
        try:
            result = operation()
        except Exception as exc:
            trace.append({
                "stepId": f"{agent}-{len(trace) + 1}",
                "agent": agent,
                "status": "FAILED",
                "startedAt": started_at,
                "finishedAt": utc_now(),
                "durationMs": max(0, (perf_counter_ns() - started_ns) // 1_000_000),
                "inputArtifactIds": input_artifacts,
                "outputArtifactIds": [],
                "evidence": evidence,
                "summary": f"{type(exc).__name__}: {exc}",
                "implementationVersion": implementation_version,
            })
            raise

        trace.append({
            "stepId": f"{agent}-{len(trace) + 1}",
            "agent": agent,
            "status": "SUCCEEDED",
            "startedAt": started_at,
            "finishedAt": utc_now(),
            "durationMs": max(0, (perf_counter_ns() - started_ns) // 1_000_000),
            "inputArtifactIds": input_artifacts,
            "outputArtifactIds": output_artifacts,
            "evidence": evidence,
            "summary": summarize(result),
            "implementationVersion": implementation_version,
        })
        return result

    def process_plan(self, payload: dict) -> dict:
        run_id = f"run_{uuid4().hex}"
        trace = []
        warnings = []
        track_id = payload.get("trackId") or "KA-T-000342"
        date = payload.get("planningDate") or "2026-09-15"
        start_time = payload.get("startTime") or "19:00"
        end_time = payload.get("endTime") or "20:30"
        request_id = payload.get("requestId") or payload.get("taskId")
        prohibited_start = payload.get("prohibitedStartTime")
        prohibited_end = payload.get("prohibitedEndTime")
        observed_at = utc_now()

        maint_data = self._execute_step(
            trace,
            "maintenance-risk",
            self.maintenance_agent.VERSION,
            ["planning-request:v1"],
            ["maintenance-assessment:v1"],
            [{"sourceType": "MAINTENANCE_REQUEST", "sourceId": request_id or "unassigned", "observedAt": observed_at}],
            lambda: self.maintenance_agent.analyze(payload),
            lambda result: f"Risk and duration normalized for {result['trackId']}; {result['durationMinutes']} minutes required.",
        )

        traffic_data = self._execute_step(
            trace,
            "traffic",
            self.traffic_agent.VERSION,
            ["planning-request:v1"],
            ["track-occupancy:v1"],
            [{"sourceType": "TIMETABLE", "sourceId": f"schedule:{track_id}:{date}", "observedAt": observed_at}],
            lambda: self.traffic_agent.analyze_traffic(track_id, start_time, end_time),
            lambda result: (
                f"{len(result['conflicts'])} conflicting movement(s) found in the requested window."
                if result["hasConflict"] else "No timetable overlap found in the requested window."
            ),
        )
        trace[-1]["evidence"][0]["sourceType"] = traffic_data.get("scheduleSource", "UNKNOWN_TIMETABLE")
        if not traffic_data.get("scheduleAuthoritative"):
            warnings.append("The authoritative timetable API is unavailable; fallback schedule data is advisory only.")

        feasible_windows = None
        if (prohibited_start and prohibited_end) or traffic_data["hasConflict"]:
            search_after = prohibited_end if prohibited_end else start_time
            earliest_day_offset = 1 if prohibited_start and prohibited_end and prohibited_end < prohibited_start else 0
            window_evidence = [
                {"sourceType": "TIMETABLE", "sourceId": f"schedule:{track_id}:{date}", "observedAt": observed_at},
            ]
            if prohibited_start and prohibited_end:
                window_evidence.append(
                    {"sourceType": "OFFICER_CONSTRAINT", "sourceId": f"blackout:{request_id or run_id}", "observedAt": observed_at}
                )
            window_inputs = ["track-occupancy:v1", "maintenance-assessment:v1"]
            if prohibited_start and prohibited_end:
                window_inputs.append("officer-constraint:v1")
            feasible_windows = self._execute_step(
                trace,
                "traffic-window-search",
                self.traffic_agent.VERSION,
                window_inputs,
                ["feasible-windows:v1"],
                window_evidence,
                lambda: self.traffic_agent.find_clear_windows(
                    track_id,
                    search_after,
                    maint_data["durationMinutes"],
                    earliest_day_offset=earliest_day_offset,
                ),
                lambda result: f"{len(result)} conflict-free candidate window(s) found.",
            )
            trace[-1]["evidence"][0]["sourceType"] = self.traffic_agent.last_schedule_source

        plan_result = self._execute_step(
            trace,
            "block-planner",
            self.block_planner_agent.VERSION,
            ["maintenance-assessment:v1", "track-occupancy:v1"] + (["feasible-windows:v1"] if feasible_windows is not None else []),
            ["ranked-plan:v1"],
            [],
            lambda: self.block_planner_agent.generate_plan(
                maint_data,
                traffic_data,
                date,
                prohibited_start=prohibited_start,
                prohibited_end=prohibited_end,
                feasible_windows=feasible_windows,
            ),
            lambda result: (
                f"{len(result.get('alternatives', []))} option(s) ranked; a recommended block was produced."
                if result.get("recommendedBlock") else "No feasible recommendation was produced."
            ),
        )

        recommendation = plan_result.get("recommendedBlock")
        recommendation_traffic = (
            self.traffic_agent.analyze_traffic(track_id, recommendation["startTime"], recommendation["endTime"])
            if recommendation else {"hasConflict": True, "conflicts": []}
        )

        verification = self._execute_step(
            trace,
            "safety-verifier",
            self.safety_verifier_agent.VERSION,
            ["maintenance-assessment:v1", "ranked-plan:v1", "track-occupancy:v2"],
            ["verification-result:v1"],
            [{"sourceType": recommendation_traffic.get("scheduleSource", "UNKNOWN_TIMETABLE"), "sourceId": f"schedule:{track_id}:{date}", "observedAt": utc_now()}],
            lambda: self.safety_verifier_agent.verify(
                maint_data,
                recommendation,
                recommendation_traffic,
                prohibited_start,
                prohibited_end,
            ),
            lambda result: (
                f"All {len(result['checkedRules'])} hard constraints passed."
                if result["passed"] else f"Vetoed: {len(result['failedRules'])} hard constraint(s) failed."
            ),
        )

        if not verification["passed"]:
            warnings.append("The safety verifier vetoed this plan; officer approval is disabled until the failed constraints are resolved.")

        explanation_details = None
        if verification["passed"]:
            explanation_details = self._execute_step(
                trace,
                "explanation",
                self.explanation_agent.VERSION,
                ["ranked-plan:v1", "verification-result:v1", "track-occupancy:v1"],
                ["plan-explanation:v1"],
                [],
                lambda: self.explanation_agent.explain(
                    payload,
                    maint_data,
                    traffic_data,
                    plan_result,
                    verification,
                ),
                lambda result: (
                    f"Grounded explanation generated with {result.get('model')}."
                    if result.get("mode") == "OPENROUTER"
                    else "Grounded deterministic explanation generated; model integration is not active."
                ),
            )
            plan_result["explanation"] = explanation_details["summary"]
            if explanation_details.get("mode") != "OPENROUTER":
                warnings.append("The verified plan is valid, but its narrative used the deterministic explanation fallback.")
        else:
            skipped_at = utc_now()
            trace.append({
                "stepId": f"explanation-{len(trace) + 1}",
                "agent": "explanation",
                "status": "SKIPPED",
                "startedAt": skipped_at,
                "finishedAt": skipped_at,
                "durationMs": 0,
                "inputArtifactIds": ["verification-result:v1"],
                "outputArtifactIds": [],
                "evidence": [],
                "summary": "Not invoked because hard-constraint verification did not pass.",
                "implementationVersion": self.explanation_agent.VERSION,
            })

        plan_result.update({
            "schemaVersion": "2.0",
            "runId": run_id,
            "requestId": request_id,
            "status": "AWAITING_OFFICER" if verification["passed"] else "NEEDS_INPUT",
            "verification": verification,
            "explanationDetails": explanation_details,
            "trace": trace,
            "warnings": warnings,
            "requiresHumanApproval": True,
        })
        return plan_result
