const { fallbackStore } = require("../config/database");

function recordAgentRun(agentPlan, requestId) {
  if (!agentPlan?.runId) return null;

  const existing = fallbackStore.agent_runs.find((run) => run.run_id === agentPlan.runId);
  if (existing) return existing;

  const run = {
    run_id: agentPlan.runId,
    request_id: requestId || agentPlan.requestId || null,
    schema_version: agentPlan.schemaVersion || "1.0",
    status: agentPlan.status || "UNKNOWN",
    verification_passed: agentPlan.verification?.passed === true,
    warnings: agentPlan.warnings || [],
    created_at: agentPlan.trace?.[0]?.startedAt || new Date().toISOString(),
    completed_at: agentPlan.trace?.at(-1)?.finishedAt || new Date().toISOString(),
  };
  fallbackStore.agent_runs.push(run);

  for (const step of agentPlan.trace || []) {
    fallbackStore.agent_steps.push({
      id: fallbackStore.agent_steps.length + 1,
      run_id: agentPlan.runId,
      step_id: step.stepId,
      agent: step.agent,
      status: step.status,
      started_at: step.startedAt,
      finished_at: step.finishedAt,
      duration_ms: step.durationMs,
      implementation_version: step.implementationVersion,
      input_artifact_ids: step.inputArtifactIds || [],
      output_artifact_ids: step.outputArtifactIds || [],
      evidence: step.evidence || [],
      summary: step.summary,
    });
  }

  const failuresByRule = new Map(
    (agentPlan.verification?.failedRules || []).map((failure) => [failure.ruleId, failure])
  );
  for (const ruleId of agentPlan.verification?.checkedRules || []) {
    const failure = failuresByRule.get(ruleId);
    fallbackStore.constraint_results.push({
      id: fallbackStore.constraint_results.length + 1,
      run_id: agentPlan.runId,
      rule_id: ruleId,
      passed: !failure,
      severity: failure?.severity || "HARD",
      message: failure?.message || "Constraint passed.",
    });
  }

  return run;
}

module.exports = { recordAgentRun };
