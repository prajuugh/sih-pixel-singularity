// backend/src/services/planning.service.js
const { fallbackStore } = require("../config/database");
const { callPythonAgentService } = require("./agent.service");

async function generatePlan(startDate, horizon = "WEEKLY", userId = 1) {
  const planId = `PLAN-${horizon}-${Date.now().toString().slice(-6)}`;

  const newPlan = {
    id: fallbackStore.block_plans.length + 1,
    plan_id: planId,
    planning_date: startDate || new Date().toISOString().split("T")[0],
    horizon,
    status: "DRAFT",
    generated_at: new Date().toISOString(),
    created_by: userId,
  };

  fallbackStore.block_plans.push(newPlan);

  // Group pending maintenance tasks and submitted requests
  const pendingRequests = fallbackStore.maintenance_requests.filter(
    (r) => r.status === "SUBMITTED" || r.status === "APPROVED"
  );

  const generatedBlocks = [];
  const generatedAlternatives = [];

  for (const req of pendingRequests) {
    const agentResponse = await callPythonAgentService("/agent/plan", {
      requestId: req.request_id,
      planningDate: req.requested_date,
      trackId: req.track_id,
      durationMinutes: req.estimated_duration_minutes,
    });

    const blockId = fallbackStore.blocks.length + 1;
    const block = {
      id: blockId,
      block_plan_id: newPlan.id,
      track_id: req.track_id,
      date: agentResponse.recommendedBlock ? agentResponse.recommendedBlock.date : req.requested_date,
      start_time: agentResponse.recommendedBlock ? agentResponse.recommendedBlock.startTime : req.preferred_start_time,
      end_time: agentResponse.recommendedBlock ? agentResponse.recommendedBlock.endTime : req.preferred_end_time,
      priority_score: agentResponse.priorityScore || 85,
      status: "PROPOSED",
      reason: agentResponse.explanation,
      created_at: new Date().toISOString(),
    };

    fallbackStore.blocks.push(block);
    generatedBlocks.push(block);

    // Record alternatives
    if (agentResponse.alternatives) {
      for (const alt of agentResponse.alternatives) {
        const altRecord = {
          id: fallbackStore.planning_alternatives.length + 1,
          request_id: req.request_id,
          block_id: blockId,
          alternative_type: alt.type,
          description: alt.description,
          feasible: alt.feasible,
          train_impact: alt.trainImpact,
          delay_minutes: alt.delayMinutes,
          priority_score: alt.priorityScore,
          rank: alt.rank,
          created_at: new Date().toISOString(),
        };
        fallbackStore.planning_alternatives.push(altRecord);
        generatedAlternatives.push(altRecord);
      }
    }
  }

  return {
    plan: newPlan,
    blocks: generatedBlocks,
    alternatives: generatedAlternatives,
  };
}

module.exports = {
  generatePlan,
};
