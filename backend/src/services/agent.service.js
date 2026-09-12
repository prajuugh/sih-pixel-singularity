const { AGENT_SERVICE_URL } = require("../config/env");

function degradedAgentResponse(payload, reason) {
  const now = new Date().toISOString();
  const requestId = payload.requestId || payload.taskId || null;
  const trackId = payload.trackId || "KA-T-000342";

  return {
    schemaVersion: "2.0",
    runId: `degraded_${Date.now()}`,
    requestId,
    status: "DEGRADED",
    priorityScore: null,
    breakdown: {},
    conflict: null,
    conflictingTrains: [],
    recommendedBlock: null,
    alternatives: [],
    explanation: "The planning service is unavailable. No operational recommendation was generated.",
    verification: {
      passed: false,
      checkedRules: ["AGENT_SERVICE_AVAILABLE"],
      failedRules: [{
        ruleId: "AGENT_SERVICE_AVAILABLE",
        severity: "HARD",
        message: "The verified Python planning service could not be reached.",
      }],
    },
    trace: [{
      stepId: "agent-service-1",
      agent: "agent-service",
      status: "FAILED",
      startedAt: now,
      finishedAt: now,
      durationMs: 0,
      inputArtifactIds: ["planning-request:v1"],
      outputArtifactIds: [],
      evidence: [{ sourceType: "MAINTENANCE_REQUEST", sourceId: requestId || trackId, observedAt: now }],
      summary: reason || "Planning service unavailable; execution stopped safely.",
      implementationVersion: "node-bridge@2.0.0",
    }],
    warnings: ["Degraded mode is informational only. Retry when the planning service is healthy."],
    requiresHumanApproval: true,
  };
}

async function callPythonAgentService(endpoint, payload) {
  try {
    const response = await fetch(`${AGENT_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) return await response.json();

    const errorBody = await response.text();
    console.warn(`Python Agent Service rejected ${endpoint} (${response.status}): ${errorBody.slice(0, 300)}`);
    return degradedAgentResponse(payload, `Planning service rejected the request (${response.status}).`);
  } catch (err) {
    console.warn(`Python Agent Service (${AGENT_SERVICE_URL}) unavailable; failing closed:`, err.message);
    return degradedAgentResponse(payload, `Planning service unavailable: ${err.name || "connection error"}.`);
  }
}

module.exports = { callPythonAgentService, degradedAgentResponse };
