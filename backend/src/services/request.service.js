// backend/src/services/request.service.js
const { fallbackStore } = require("../config/database");
const { callPythonAgentService } = require("./agent.service");
const { persistLocalStore } = require("./local-store.service");
const { recordAgentRun } = require("./agent-run.service");

async function enrichRequestWithAgentPlan(req) {
  const existingPlan = req.agent_plan;
  const traceVersions = new Set((existingPlan?.trace || []).map((step) => step.implementationVersion));
  const hasNetworkAwarePlan = traceVersions.has("traffic-rules@2.1.0") && traceVersions.has("block-planner@2.1.0");
  const isAwaitingDecision = ["SUBMITTED", "UNDER_REVIEW"].includes(req.status);
  const hadInfrastructureFailure = existingPlan?.verification?.failedRules?.some(
    (r) => r.ruleId === "AUTHORITATIVE_TIMETABLE" || r.ruleId === "AGENT_SERVICE_AVAILABLE"
  );

  // Preserve valid completed decisions and current plans. If a stored plan failed due to
  // an infrastructure/network glitch, refresh it with the verified agent service.
  if (existingPlan && !hadInfrastructureFailure && (!isAwaitingDecision || hasNetworkAwarePlan)) {
    return req;
  }

  try {
    const primaryTrackId = req.track_id || (Array.isArray(req.track_ids) && req.track_ids[0]) || "KA-T-000342";
    const agentPlan = await callPythonAgentService("/agent/plan", {
      requestId: req.request_id,
      trackId: primaryTrackId,
      department: req.department,
      assetType: req.asset_type || "TRACK",
      planningDate: req.requested_date || req.from_date || "2026-09-15",
      startTime: req.preferred_start_time || "19:00",
      endTime: req.preferred_end_time || "20:30",
      durationMinutes: req.estimated_duration_minutes || 120,
    });
    if (existingPlan && agentPlan?.status === "DEGRADED") return req;
    recordAgentRun(agentPlan, req.request_id);

    req.agent_plan = agentPlan;
    req.priority_score = agentPlan?.priorityScore ?? (agentPlan?.schemaVersion === "2.0" ? null : 75);
    req.conflict = agentPlan?.conflict ?? null;
    req.conflicting_trains = agentPlan?.conflictingTrains || [];
    req.recommended_block = agentPlan?.schemaVersion === "2.0" ? agentPlan.recommendedBlock : (agentPlan?.recommendedBlock || {
      date: req.requested_date || req.from_date || "2026-09-15",
      startTime: req.preferred_start_time || "19:00",
      endTime: req.preferred_end_time || "20:30",
      trackId: primaryTrackId,
      priorityScore: agentPlan?.priorityScore || 75,
    });
    req.ai_explanation = agentPlan?.explanation || "Multi-agent block planning analysis completed.";
    req.alternatives = agentPlan?.alternatives || [];

    if (Array.isArray(agentPlan?.alternatives)) {
      for (const alt of agentPlan.alternatives) {
        const existing = fallbackStore.planning_alternatives.find(
          (a) => a.request_id === req.request_id && a.alternative_type === alt.type
        );
        if (!existing) {
          fallbackStore.planning_alternatives.push({
            id: fallbackStore.planning_alternatives.length + 1,
            request_id: req.request_id,
            alternative_type: alt.type,
            description: alt.description,
            feasible: alt.feasible !== undefined ? alt.feasible : true,
            train_impact: alt.trainImpact || "",
            delay_minutes: alt.delayMinutes || 0,
            priority_score: alt.priorityScore || 70,
            rank: alt.rank || 1,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.warn(`Could not enrich request ${req.request_id} with agent plan:`, err.message);
  }

  persistLocalStore(fallbackStore);

  return req;
}

async function createRequest(userId, payload) {
  const reqCount = fallbackStore.maintenance_requests.length + 1;
  const dept = payload.department || "Engineering";
  const deptCode = dept.substring(0, 3).toUpperCase();
  const preferredId = payload.requestId || payload.request_id;
  const generatedId = `${deptCode}-2026-${String(reqCount).padStart(5, "0")}`;
  const preferredTaken = preferredId && fallbackStore.maintenance_requests.some((r) => r.request_id === preferredId);
  const requestId = preferredId && !preferredTaken ? preferredId : generatedId;

  const fromDate = payload.fromDate || payload.from_date || payload.requested_date || new Date().toISOString().split("T")[0];
  const toDate = payload.toDate || payload.to_date || fromDate;
  const duration = Number(payload.durationMinutes || payload.duration || payload.estimated_duration_minutes || 120);

  // Compute fallback preferred start & end time if not explicitly provided
  let startTime = payload.preferred_start_time || payload.fromTime || payload.startTime || "19:00";
  let endTime = payload.preferred_end_time || payload.toTime || payload.endTime;
  if (!endTime) {
    const [h, m] = startTime.split(":").map(Number);
    const endMinutes = (h * 60 + m + duration) % (24 * 60);
    const endH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const endM = String(endMinutes % 60).padStart(2, "0");
    endTime = `${endH}:${endM}`;
  }

  let trackIds = [];
  if (Array.isArray(payload.trackIds) && payload.trackIds.length > 0) {
    trackIds = payload.trackIds;
  } else if (Array.isArray(payload.track_ids) && payload.track_ids.length > 0) {
    trackIds = payload.track_ids;
  } else if (payload.trackId || payload.track_id) {
    trackIds = [payload.trackId || payload.track_id];
  } else {
    trackIds = ["KA-T-000342"];
  }
  const primaryTrackId = trackIds[0];

  // Execute the Multi-Agent Optimization Service (Orchestrator, Maintenance, Traffic, Block Planner)
  let agentPlan = null;
  try {
    agentPlan = await callPythonAgentService("/agent/plan", {
      requestId,
      trackId: primaryTrackId,
      department: dept,
      assetType: (payload.assetType || payload.asset_type || "TRACK").toUpperCase(),
      planningDate: fromDate,
      startTime,
      endTime,
      durationMinutes: duration,
      criticality: payload.criticality,
      urgency: payload.urgency,
      failureProbability: payload.failureProbability,
      overdueDays: payload.overdueDays,
    });
    recordAgentRun(agentPlan, requestId);
  } catch (err) {
    console.warn("Python agent service execution error during createRequest:", err.message);
  }

  const newRequest = {
    id: reqCount,
    request_id: requestId,
    created_by: userId,
    department: dept,
    asset_type: (payload.assetType || payload.asset_type || "TRACK").toUpperCase(),
    asset_condition: payload.assetCondition || payload.asset_condition || "Good",
    track_id: primaryTrackId,
    track_ids: trackIds,
    task_type: payload.maintenanceType || payload.task_type || payload.taskType || "Routine Maintenance",
    description: payload.workDescription || payload.description || "",
    requested_date: fromDate,
    from_date: fromDate,
    to_date: toDate,
    preferred_start_time: startTime,
    preferred_end_time: endTime,
    estimated_duration_minutes: duration,
    required_block: payload.required_block !== undefined ? payload.required_block : (payload.requiredBlock !== undefined ? payload.requiredBlock : true),
    status: payload.status || "SUBMITTED",
    agent_plan: agentPlan,
    priority_score: agentPlan?.priorityScore ?? (agentPlan?.schemaVersion === "2.0" ? null : 75),
    conflict: agentPlan?.conflict ?? null,
    conflicting_trains: agentPlan?.conflictingTrains || [],
    recommended_block: agentPlan?.schemaVersion === "2.0" ? agentPlan.recommendedBlock : (agentPlan?.recommendedBlock || {
      date: fromDate,
      startTime,
      endTime,
      trackId: primaryTrackId,
      priorityScore: agentPlan?.priorityScore || 75,
    }),
    ai_explanation: agentPlan?.explanation || "Multi-agent block planning analysis completed.",
    alternatives: agentPlan?.alternatives || [],
    officer_feedback: null,
    officer_id: null,
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  fallbackStore.maintenance_requests.push(newRequest);

  // Record alternatives into planning_alternatives table
  if (Array.isArray(agentPlan?.alternatives)) {
    for (const alt of agentPlan.alternatives) {
      fallbackStore.planning_alternatives.push({
        id: fallbackStore.planning_alternatives.length + 1,
        request_id: requestId,
        alternative_type: alt.type,
        description: alt.description,
        feasible: alt.feasible !== undefined ? alt.feasible : true,
        train_impact: alt.trainImpact || "",
        delay_minutes: alt.delayMinutes || 0,
        priority_score: alt.priorityScore || 70,
        rank: alt.rank || 1,
        created_at: new Date().toISOString(),
      });
    }
  }

  persistLocalStore(fallbackStore);

  return newRequest;
}

async function reviewRequest(requestId, officerId, decision, feedback, alternativeId = null, prohibitedWindow = null) {
  const req = fallbackStore.maintenance_requests.find((r) => r.request_id === requestId);
  if (!req) {
    throw { statusCode: 404, code: "REQUEST_NOT_FOUND", message: `Request ${requestId} not found` };
  }

  if (
    decision === "APPROVED" &&
    req.agent_plan?.schemaVersion === "2.0" &&
    req.agent_plan?.verification?.passed !== true
  ) {
    throw {
      statusCode: 409,
      code: "PLAN_NOT_VERIFIED",
      message: "This plan cannot be approved because hard-constraint verification did not pass.",
    };
  }

  // Update request status based on officer decision
  if (decision === "APPROVED") {
    req.status = "APPROVED";
  } else if (decision === "REJECTED") {
    req.status = "REJECTED";
  } else if (decision === "REVISION_REQUIRED") {
    req.status = "REVISION_REQUIRED";
  }

  req.officer_feedback = feedback;
  req.officer_id = officerId;
  req.reviewed_at = new Date().toISOString();
  req.updated_at = new Date().toISOString();

  // If officer marked prohibited times, revise the entire block plan via Multi-Agent Service
  if (prohibitedWindow && prohibitedWindow.startTime && prohibitedWindow.endTime) {
    req.prohibited_window = prohibitedWindow;
    req.prohibited_start_time = prohibitedWindow.startTime;
    req.prohibited_end_time = prohibitedWindow.endTime;

    try {
      const revisedPlan = await callPythonAgentService("/agent/plan", {
        requestId: req.request_id,
        trackId: req.track_id,
        department: req.department,
        assetType: req.asset_type,
        planningDate: req.requested_date || req.from_date,
        startTime: req.preferred_start_time,
        endTime: req.preferred_end_time,
        durationMinutes: req.estimated_duration_minutes || 90,
        prohibitedStartTime: prohibitedWindow.startTime,
        prohibitedEndTime: prohibitedWindow.endTime,
      });
      recordAgentRun(revisedPlan, req.request_id);

      if (revisedPlan) {
        req.agent_plan = revisedPlan;
        req.priority_score = revisedPlan.priorityScore;
        req.conflict = revisedPlan.conflict;
        req.conflicting_trains = revisedPlan.conflictingTrains || [];
        req.recommended_block = revisedPlan.recommendedBlock || null;
        req.ai_explanation = revisedPlan.explanation || "";
        req.alternatives = revisedPlan.alternatives || [];

        if (revisedPlan.recommendedBlock) {
          req.scheduled_start_time = revisedPlan.recommendedBlock.startTime;
          req.scheduled_end_time = revisedPlan.recommendedBlock.endTime;
          req.scheduled_date = revisedPlan.recommendedBlock.date;
        }

        // Refresh alternatives in fallbackStore.planning_alternatives for this request
        fallbackStore.planning_alternatives = fallbackStore.planning_alternatives.filter(
          (a) => a.request_id !== requestId
        );
        if (Array.isArray(revisedPlan.alternatives)) {
          for (const alt of revisedPlan.alternatives) {
            fallbackStore.planning_alternatives.push({
              id: fallbackStore.planning_alternatives.length + 1,
              request_id: requestId,
              alternative_type: alt.type,
              description: alt.description,
              feasible: alt.feasible !== undefined ? alt.feasible : true,
              train_impact: alt.trainImpact || "",
              delay_minutes: alt.delayMinutes || 0,
              priority_score: alt.priorityScore || 70,
              rank: alt.rank || 1,
              created_at: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err) {
      console.warn("Error re-running block planner for prohibited window:", err.message);
    }
  }

  // If officer selected an alternative, apply it to the scheduled block
  if (alternativeId) {
    const chosenAlt = fallbackStore.planning_alternatives.find(
      (a) => (a.id === Number(alternativeId) || a.alternative_type === alternativeId) && a.request_id === requestId
    ) || (req.alternatives && req.alternatives.find((a) => a.id === Number(alternativeId) || a.type === alternativeId));

    if (chosenAlt) {
      req.selected_alternative = chosenAlt;
      if (chosenAlt.alternative_type === "RESCHEDULE" || chosenAlt.type === "RESCHEDULE") {
        if (req.recommended_block) {
          req.scheduled_start_time = req.recommended_block.startTime;
          req.scheduled_end_time = req.recommended_block.endTime;
          req.scheduled_date = req.recommended_block.date;
        }
      }
    }
  }

  // Record officer review in request_reviews
  const review = {
    id: fallbackStore.request_reviews.length + 1,
    request_id: requestId,
    officer_id: officerId,
    decision,
    feedback,
    alternative_id: alternativeId,
    prohibited_window: prohibitedWindow,
    created_at: new Date().toISOString(),
  };
  fallbackStore.request_reviews.push(review);

  // Add to audit log
  fallbackStore.audit_logs.push({
    id: fallbackStore.audit_logs.length + 1,
    user_id: officerId,
    action: `OFFICER_${decision}_REQUEST`,
    entity_type: "MAINTENANCE_REQUEST",
    entity_id: requestId,
    new_value: {
      status: req.status,
      feedback,
      decision,
      alternative_id: alternativeId,
      prohibited_window: prohibitedWindow,
    },
    timestamp: new Date().toISOString(),
  });

  persistLocalStore(fallbackStore);

  return { request: req, review };
}

module.exports = {
  createRequest,
  reviewRequest,
  enrichRequestWithAgentPlan,
};
