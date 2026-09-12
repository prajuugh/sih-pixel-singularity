import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  Clock3,
  Database,
  FileInput,
  GitCompareArrows,
  LoaderCircle,
  ListOrdered,
  Scale,
  ShieldCheck,
  Sparkles,
  TrainFront,
  UserRoundCheck,
  X,
} from "lucide-react";

function formatWindow(window) {
  if (!window?.startTime || !window?.endTime) return "Window recorded";
  return `${window.startTime}–${window.endTime}`;
}

export default function AgentDecisionTrace({
  requestId,
  trackIds = [],
  requestedWindow,
  agentPlan,
  conflictData,
  status,
  compact = false,
}) {
  const alternatives = agentPlan?.alternatives || [];
  const conflicts = agentPlan?.conflictingTrains || conflictData?.conflicts || [];
  const hasConflict = agentPlan?.conflict ?? (conflictData ? !conflictData.safe : null);
  const priorityScore = agentPlan?.priorityScore;
  const recommendation = agentPlan?.recommendedBlock;
  const trackCount = Math.max(trackIds.length, agentPlan?.trackId ? 1 : 0) || 1;
  const isApproved = ["Approved", "APPROVED", "Completed", "COMPLETED"].includes(status);
  const executionTrace = Array.isArray(agentPlan?.trace) ? agentPlan.trace : [];
  const verification = agentPlan?.verification;
  const warnings = agentPlan?.warnings || [];

  const agentIcons = {
    "maintenance-risk": Scale,
    traffic: TrainFront,
    "traffic-window-search": Clock3,
    "block-planner": GitCompareArrows,
    "safety-verifier": ShieldCheck,
    explanation: Sparkles,
    "agent-service": AlertTriangle,
  };

  const realSteps = executionTrace.map((step) => ({
    label: step.agent
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    title: step.status === "SUCCEEDED" ? "Completed" : step.status === "RUNNING" ? "Running" : step.status === "SKIPPED" ? "Skipped" : "Stopped",
    detail: step.summary || "No execution summary recorded",
    evidence: `${step.evidence?.length || 0} evidence source${step.evidence?.length === 1 ? "" : "s"} · ${step.durationMs ?? 0} ms`,
    version: step.implementationVersion,
    sources: step.evidence || [],
    icon: agentIcons[step.agent] || Bot,
    executionStatus: step.status,
  }));

  const legacySteps = [
    {
      label: "Request agent",
      title: "Inputs verified",
      detail: `${trackCount} ${trackCount === 1 ? "track segment" : "track segments"} · ${formatWindow(requestedWindow)}`,
      evidence: "Request data",
      icon: FileInput,
    },
    {
      label: "Traffic agent",
      title: "Timetable checked",
      detail:
        hasConflict === null
          ? "Awaiting traffic evidence"
          : hasConflict
            ? `${conflicts.length || 1} conflicting movement${conflicts.length === 1 ? "" : "s"} found`
            : "No conflicting movements found",
      evidence: "Train schedule",
      icon: TrainFront,
    },
    {
      label: "Safety agent",
      title: "Priority scored",
      detail: priorityScore != null ? `${priorityScore}/100 MCDA score` : "Score not recorded",
      evidence: "Safety factors",
      icon: Scale,
    },
    {
      label: "Planner agent",
      title: "Options ranked",
      detail: alternatives.length
        ? `${alternatives.length} feasible option${alternatives.length === 1 ? "" : "s"} compared`
        : recommendation
          ? `Recommended ${formatWindow(recommendation)}`
          : "No recommendation recorded",
      evidence: "Constraint solver",
      icon: alternatives.length ? ListOrdered : GitCompareArrows,
    },
    {
      label: "Human control",
      title: isApproved ? "Decision approved" : "Officer review required",
      detail: isApproved ? "Plan released to operations" : "AI output remains advisory",
      evidence: "Accountable decision",
      icon: UserRoundCheck,
      human: true,
    },
  ];

  const humanStep = {
    label: "Human control",
    title: isApproved ? "Decision approved" : verification?.passed === false ? "Approval blocked" : "Officer review required",
    detail: isApproved
      ? "Plan released to operations"
      : verification?.passed === false
        ? "Resolve failed hard constraints before approval"
        : "Verified AI output remains advisory",
    evidence: "Accountable decision",
    icon: UserRoundCheck,
    human: true,
    executionStatus: verification?.passed === false ? "BLOCKED" : "PENDING",
  };

  const steps = realSteps.length ? [...realSteps, humanStep] : legacySteps;
  const traceComplete = realSteps.length > 0 && verification?.passed === true;
  const traceFailed = realSteps.some((step) => step.executionStatus === "FAILED") || verification?.passed === false;
  const failedRules = new Map((verification?.failedRules || []).map((failure) => [failure.ruleId, failure]));

  const getStepTone = (step) => {
    if (step.human) return "bg-[#315b75] text-white";
    if (step.executionStatus === "FAILED" || step.executionStatus === "BLOCKED") return "border border-red-200 bg-red-50 text-red-700";
    if (step.executionStatus === "RUNNING") return "border border-blue-200 bg-blue-50 text-blue-700";
    if (step.executionStatus === "SKIPPED") return "border border-gray-200 bg-gray-50 text-gray-500";
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  };

  return (
    <section className="overflow-hidden rounded-xl border border-[#dfe3e1] bg-[#fbfcfb]" aria-label="Multi-agent decision trace">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e7eae7] px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-[#171918]">Decision ledger</h4>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              traceFailed
                ? "border-red-200 bg-red-50 text-red-700"
                : traceComplete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-[#c8d8e1] bg-[#edf4f7] text-[#315b75]"
            }`}>
              {traceFailed ? <X size={10} /> : traceComplete ? <Check size={10} /> : <LoaderCircle size={10} />}
              {traceFailed ? "Verification blocked" : traceComplete ? "Verified trace" : "Decision trace"}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">What each agent received, checked and handed forward.</p>
        </div>
        <div className="text-right">
          {requestId && <span className="block font-mono text-xs font-semibold text-gray-400">Case {requestId}</span>}
          {agentPlan?.runId && <span className="mt-1 block font-mono text-[10px] text-gray-400">{agentPlan.runId}</span>}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          {warnings.join(" ")}
        </div>
      )}

      <div className="overflow-x-auto">
      <ol
        className={`grid ${compact ? "min-w-[760px]" : "min-w-[860px]"}`}
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(140px, 1fr))` }}
      >
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.label}
              className="relative min-w-0 border-r border-[#e7eae7] px-3 py-3 last:border-r-0"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full ${getStepTone(step)}`}
                >
                  <Icon size={13} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-gray-400">{index + 1} · {step.label}</p>
                  <p className="mt-0.5 text-xs font-semibold text-gray-900">{step.title}</p>
                  <p className="mt-1 text-xs leading-4 text-gray-600">{step.detail}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-gray-400">From {step.evidence}</p>
                  {step.version && <p className="mt-1 truncate font-mono text-[10px] text-gray-400">{step.version}</p>}
                  {step.sources?.length > 0 && (
                    <details className="mt-2 text-[10px] text-gray-500">
                      <summary className="cursor-pointer font-semibold text-[#315b75]">Evidence</summary>
                      <ul className="mt-1 space-y-1">
                        {step.sources.map((source) => (
                          <li key={`${source.sourceType}-${source.sourceId}`} className="flex gap-1">
                            <Database size={10} className="mt-0.5 shrink-0" />
                            <span className="break-all">{source.sourceType}: {source.sourceId}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && <ArrowRight size={12} className="absolute -right-1.5 top-5 z-10 hidden bg-[#fbfcfb] text-gray-300 lg:block" />}
            </li>
          );
        })}
      </ol>
      </div>

      {verification?.checkedRules?.length > 0 && (
        <div className="border-t border-[#e7eae7] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-[#171918]">Hard-constraint verification</p>
            <p className="text-[10px] font-medium text-gray-400">
              {verification.checkedRules.length - failedRules.size}/{verification.checkedRules.length} passed
            </p>
          </div>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
            {verification.checkedRules.map((ruleId) => {
              const failure = failedRules.get(ruleId);
              return (
                <li
                  key={ruleId}
                  title={failure?.message || "Constraint passed"}
                  className={`flex items-start gap-1.5 rounded-md border px-2 py-1.5 text-[10px] font-semibold ${
                    failure ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {failure ? <X size={11} className="mt-0.5 shrink-0" /> : <Check size={11} className="mt-0.5 shrink-0" />}
                  <span>
                    {ruleId.replaceAll("_", " ")}
                    {failure?.message && <span className="mt-0.5 block font-normal leading-4">{failure.message}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
