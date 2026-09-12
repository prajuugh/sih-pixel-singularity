// backend/scripts/test_backend.js
const { initializeDatabase } = require("./init_db");
const { checkConflict } = require("../src/services/maintenance.service");
const { createRequest, reviewRequest } = require("../src/services/request.service");
const { generatePlan } = require("../src/services/planning.service");
const { fallbackStore } = require("../src/config/database");

async function runTests() {
  console.log("=================================================================");
  console.log("🧪 AUTOMATED SUITE FOR BACKEND PRD & CRITICAL TEST SCENARIOS");
  console.log("=================================================================");

  // 1. Init Database & Seed Tracks
  await initializeDatabase();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Verification 1: Tracks count (5,461)
  assert(fallbackStore.tracks.length === 5461, `5,461 Karnataka track segments loaded (Found: ${fallbackStore.tracks.length})`);
  assert(fallbackStore.tracks[0].track_id === "KA-T-000001", `Track ID format preserved KA-T-000001`);
  assert(fallbackStore.tracks[5460].track_id === "KA-T-005461", `Track ID format preserved KA-T-005461`);

  // Verification 2: Domain data quantities
  assert(fallbackStore.assets.length >= 300, `Assets count >= 300 (Found: ${fallbackStore.assets.length})`);
  assert(fallbackStore.maintenance_tasks.length >= 200, `Maintenance tasks >= 200 (Found: ${fallbackStore.maintenance_tasks.length})`);
  assert(fallbackStore.trains.length >= 40, `Trains count >= 40 (Found: ${fallbackStore.trains.length})`);
  assert(fallbackStore.train_route_segments.length >= 1500, `Train route segments >= 1,500 (Found: ${fallbackStore.train_route_segments.length})`);
  assert(fallbackStore.goods_forecasts.length >= 300, `Goods forecasts >= 300 (Found: ${fallbackStore.goods_forecasts.length})`);
  assert(fallbackStore.corridors.length >= 8, `Corridors >= 8 (Found: ${fallbackStore.corridors.length})`);
  assert(fallbackStore.corridor_availability.length >= 500, `Corridor availability >= 500 (Found: ${fallbackStore.corridor_availability.length})`);

  // Verification 3: Test 1 - No Conflict Scenario
  console.log("\n--- Executing Test 1: No Conflict Scenario ---");
  const noConflictRes = await checkConflict("KA-T-000342", "2026-09-15", "03:00", "04:30");
  assert(noConflictRes.safe === true, `No conflict detected during free night slot 03:00-04:30`);
  assert(noConflictRes.conflicts.length === 0, `Conflicts array is empty`);

  // Verification 4: Test 2 - Passenger Train Conflict
  console.log("\n--- Executing Test 2: Passenger Train Conflict ---");
  const conflictRes = await checkConflict("KA-T-000342", "2026-09-15", "19:00", "20:00");
  assert(conflictRes.safe === false, `Conflict detected during train 12627 passage (19:15-19:22)`);
  assert(conflictRes.conflicts.length > 0, `Conflicts list populated with train details`);
  assert(conflictRes.conflicts[0].trainNo === "12627", `Identified Karnataka Express (12627)`);

  // Verification 5: Request Creation & Officer State Machine
  console.log("\n--- Executing Request & Officer Review Test ---");
  const req = await createRequest(4, {
    department: "Engineering",
    asset_type: "TRACK",
    track_id: "KA-T-000342",
    task_type: "Rail Replacement",
    description: "Emergency rail replacement",
    requested_date: "2026-09-15",
    preferred_start_time: "19:00",
    preferred_end_time: "20:30",
  });
  assert(req.status === "SUBMITTED", `Created request status is SUBMITTED (${req.request_id})`);

  const reviewRes = await reviewRequest(req.request_id, 2, "REVISION_REQUIRED", "Window conflicts with Karnataka Express movement.");
  assert(reviewRes.request.status === "REVISION_REQUIRED", `State transitioned to REVISION_REQUIRED`);
  assert(reviewRes.request.officer_feedback.includes("Karnataka Express"), `Officer feedback recorded`);

  // Verification 6: Prohibited Window & Entire Block Plan Revision
  console.log("\n--- Executing Officer Prohibited Window & Plan Revision Test ---");
  const prohibitedReview = await reviewRequest(
    req.request_id,
    2,
    "REVISION_REQUIRED",
    "Peak passenger traffic - possession strictly prohibited between 18:00 and 22:00.",
    null,
    { startTime: "18:00", endTime: "22:00" }
  );
  assert(prohibitedReview.request.status === "REVISION_REQUIRED", `Request status is REVISION_REQUIRED after blackout`);
  assert(Boolean(prohibitedReview.request.prohibited_window), `Prohibited window recorded on request`);
  assert(prohibitedReview.request.prohibited_window.startTime === "18:00", `Prohibited startTime recorded as 18:00`);
  assert(prohibitedReview.request.prohibited_window.endTime === "22:00", `Prohibited endTime recorded as 22:00`);

  const revisedBlock = prohibitedReview.request.recommended_block;
  const isDegraded = prohibitedReview.request.agent_plan?.status === "DEGRADED";
  if (isDegraded) {
    assert(revisedBlock === null, `Degraded mode does not invent a recommended block`);
    assert(prohibitedReview.request.agent_plan.verification.passed === false, `Degraded plan is explicitly unverified`);
    assert(prohibitedReview.request.alternatives.length === 0, `Degraded mode does not invent alternatives`);
    let approvalBlocked = false;
    try {
      await reviewRequest(req.request_id, 2, "APPROVED", "Attempt unsafe approval");
    } catch (error) {
      approvalBlocked = error.code === "PLAN_NOT_VERIFIED";
    }
    assert(approvalBlocked, `Backend rejects approval of an unverified plan`);
  } else {
    assert(Boolean(revisedBlock), `Revised recommended block generated`);
    const [revH] = revisedBlock.startTime.split(":").map(Number);
    // Must NOT fall within prohibited 18:00 - 22:00
    const isOutsideProhibited = revH >= 22 || revH < 18;
    assert(isOutsideProhibited, `Revised block startTime (${revisedBlock.startTime}) is outside prohibited window (18:00-22:00)`);
    assert(prohibitedReview.request.alternatives.length > 0, `Revised alternatives generated (${prohibitedReview.request.alternatives.length})`);
    assert(prohibitedReview.request.agent_plan.verification.passed === true, `Revised block passed independent verification`);
  }

  // Verification 7: Plan Generation & Alternatives (Reschedule, Delay, Reroute)
  console.log("\n--- Executing Planning & Alternatives Test ---");
  const planResult = await generatePlan("2026-09-15", "WEEKLY", 1);
  if (planResult.warnings.length > 0 && planResult.blocks.length === 0) {
    assert(planResult.warnings.every((warning) => warning.code === "PLAN_NOT_VERIFIED"), `Batch planning fails closed when verification is unavailable`);
  } else {
    assert(planResult.blocks.length > 0, `Block plan generated ${planResult.blocks.length} verified blocks`);
    assert(planResult.alternatives.length > 0, `Verified alternatives generated`);
    const altTypes = planResult.alternatives.map(a => a.alternative_type);
    assert(altTypes.includes("RESCHEDULE"), `Includes RESCHEDULE alternative`);
  }

  console.log("=================================================================");
  console.log(`📊 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================");

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
