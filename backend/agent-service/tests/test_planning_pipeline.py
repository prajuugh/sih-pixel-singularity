import unittest
import json
from unittest.mock import patch

from contracts.planning import PlanResponse
from explanation.explanation_agent import ExplanationAgent
from orchestrator.orchestrator_agent import OrchestratorAgent
from safety.safety_verifier_agent import SafetyVerifierAgent
from traffic.traffic_agent import TrafficAgent


SCHEDULES = [
    {
        "trainNo": "P1",
        "trainName": "Passenger One",
        "arrival": "19:15",
        "departure": "19:22",
        "type": "SUPERFAST",
    },
    {
        "trainNo": "F1",
        "trainName": "Freight One",
        "arrival": "20:00",
        "departure": "20:12",
        "type": "GOODS",
    },
    {
        "trainNo": "N1",
        "trainName": "Night Service",
        "arrival": "23:55",
        "departure": "00:10",
        "type": "EXPRESS",
    },
]


class PlanningPipelineTests(unittest.TestCase):
    def setUp(self):
        self.agent = OrchestratorAgent()
        def fetch_test_schedules(_track_id):
            self.agent.traffic_agent.last_schedule_source = "TEST_TIMETABLE"
            self.agent.traffic_agent.last_schedule_authoritative = True
            return SCHEDULES

        self.agent.traffic_agent.fetch_track_schedules = fetch_test_schedules

    def test_conflicting_request_is_rescheduled_and_verified(self):
        result = self.agent.process_plan({
            "requestId": "TEST-1",
            "trackId": "KA-T-000342",
            "planningDate": "2026-09-15",
            "startTime": "19:00",
            "endTime": "20:30",
            "durationMinutes": 90,
        })

        PlanResponse.model_validate(result)
        self.assertTrue(result["verification"]["passed"])
        self.assertEqual("20:15", result["recommendedBlock"]["startTime"])
        self.assertEqual("AWAITING_OFFICER", result["status"])
        self.assertEqual(
            ["maintenance-risk", "traffic", "traffic-window-search", "block-planner", "safety-verifier", "explanation"],
            [step["agent"] for step in result["trace"]],
        )
        self.assertEqual("DETERMINISTIC_FALLBACK", result["explanationDetails"]["mode"])
        self.assertNotIn("REROUTE", [option["type"] for option in result["alternatives"]])

    def test_reroute_requires_connected_available_railway_edges(self):
        route = self.agent.traffic_agent.find_available_reroute("KA-T-000342")

        self.assertIsNone(route)

    def test_reroute_uses_real_connected_track_geometry_when_available(self):
        route = self.agent.traffic_agent.find_available_reroute("KA-T-000550")

        self.assertIsNotNone(route)
        self.assertEqual("OSM_RAIL_NETWORK", route["source"])
        self.assertNotIn("KA-T-000550", route["trackIds"])
        self.assertGreater(len(route["coordinates"]), 2)

    def test_blackout_replanning_checks_traffic_before_recommending(self):
        result = self.agent.process_plan({
            "requestId": "TEST-2",
            "trackId": "KA-T-000342",
            "planningDate": "2026-09-15",
            "startTime": "19:00",
            "endTime": "20:30",
            "durationMinutes": 90,
            "prohibitedStartTime": "19:00",
            "prohibitedEndTime": "22:00",
        })

        self.assertTrue(result["verification"]["passed"])
        self.assertEqual("22:15", result["recommendedBlock"]["startTime"])
        self.assertIn("NO_PROHIBITED_WINDOW_OVERLAP", result["verification"]["checkedRules"])

    def test_overnight_blackout_moves_recommendation_to_next_date(self):
        result = self.agent.process_plan({
            "requestId": "TEST-OVERNIGHT-BLACKOUT",
            "trackId": "KA-T-000342",
            "planningDate": "2026-09-15",
            "startTime": "22:30",
            "endTime": "00:00",
            "durationMinutes": 90,
            "prohibitedStartTime": "22:00",
            "prohibitedEndTime": "02:00",
        })

        self.assertTrue(result["verification"]["passed"])
        self.assertEqual("2026-09-16", result["recommendedBlock"]["date"])
        self.assertEqual(1, result["recommendedBlock"]["dayOffset"])

    def test_overnight_train_conflict_is_detected(self):
        traffic = TrafficAgent()
        def fetch_test_schedules(_track_id):
            traffic.last_schedule_source = "TEST_TIMETABLE"
            traffic.last_schedule_authoritative = True
            return SCHEDULES

        traffic.fetch_track_schedules = fetch_test_schedules

        result = traffic.analyze_traffic("KA-T-000342", "23:50", "00:20")

        self.assertTrue(result["hasConflict"])
        self.assertEqual(["N1"], [train["trainNo"] for train in result["conflicts"]])

    def test_verifier_vetoes_occupied_recommendation(self):
        verifier = SafetyVerifierAgent()
        result = verifier.verify(
            {"trackId": "KA-T-000342", "durationMinutes": 90},
            {"trackId": "KA-T-000342", "startTime": "19:00", "endTime": "20:30"},
            {"hasConflict": True, "scheduleAuthoritative": True},
        )

        self.assertFalse(result["passed"])
        self.assertIn("NO_TRACK_OCCUPANCY_OVERLAP", [failure["ruleId"] for failure in result["failedRules"]])

    def test_non_authoritative_timetable_cannot_produce_approvable_plan(self):
        self.agent.traffic_agent.analyze_traffic = lambda *_args, **_kwargs: {
            "trackId": "KA-T-000342",
            "hasConflict": False,
            "conflicts": [],
            "allSchedules": [],
            "rerouteFeasible": False,
            "rerouteDetails": "Unavailable",
            "goodsForecastCount": 0,
            "scheduleSource": "FALLBACK_FIXTURE",
            "scheduleAuthoritative": False,
        }

        result = self.agent.process_plan({
            "requestId": "TEST-DEGRADED",
            "trackId": "KA-T-000342",
            "planningDate": "2026-09-15",
            "startTime": "03:00",
            "endTime": "04:30",
            "durationMinutes": 90,
        })

        self.assertFalse(result["verification"]["passed"])
        self.assertEqual("NEEDS_INPUT", result["status"])
        self.assertIn("AUTHORITATIVE_TIMETABLE", [failure["ruleId"] for failure in result["verification"]["failedRules"]])
        self.assertEqual("SKIPPED", result["trace"][-1]["status"])

    @patch("explanation.explanation_agent.urllib.request.urlopen")
    def test_openrouter_deepseek_explanation_uses_structured_verified_facts(self, mock_urlopen):
        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                output = {
                    "headline": "Verified night block",
                    "summary": "The verified slot avoids the recorded conflict and still requires officer approval.",
                    "whyThisPlan": ["It provides the required duration.", "All recorded hard constraints passed."],
                    "risksAvoided": ["Recorded timetable overlap"],
                    "officerChecks": ["Confirm field readiness before approval."],
                }
                return json.dumps({
                    "id": "chatcmpl_test",
                    "model": "test-model",
                    "choices": [{"message": {"role": "assistant", "content": json.dumps(output)}}],
                }).encode("utf-8")

        mock_urlopen.return_value = FakeResponse()
        agent = ExplanationAgent()
        agent.api_key = "test-key"
        agent.model = "test-model"
        result = agent.explain(
            {"requestId": "TEST-AI", "planningDate": "2026-09-15", "startTime": "19:00", "endTime": "20:30"},
            {"trackId": "KA-T-000342", "department": "ENGINEERING", "durationMinutes": 90},
            {"conflicts": []},
            {
                "recommendedBlock": {"date": "2026-09-15", "startTime": "21:00", "endTime": "22:30"},
                "priorityScore": 80,
                "breakdown": {},
                "alternatives": [],
            },
            {"passed": True, "checkedRules": ["VALID_TIME_WINDOW"]},
        )

        self.assertEqual("OPENROUTER", result["mode"])
        self.assertEqual("OpenRouter", result["provider"])
        sent_body = json.loads(mock_urlopen.call_args.args[0].data.decode("utf-8"))
        self.assertEqual("test-model", sent_body["model"])
        self.assertEqual("json_schema", sent_body["response_format"]["type"])
        self.assertTrue(sent_body["provider"]["require_parameters"])
        self.assertEqual("https://openrouter.ai/api/v1/chat/completions", mock_urlopen.call_args.args[0].full_url)


if __name__ == "__main__":
    unittest.main()
