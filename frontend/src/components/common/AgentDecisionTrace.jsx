import {
  Check,
  FileInput,
  GitCompareArrows,
  ListOrdered,
  Scale,
  TrainFront,
  UserRoundCheck,
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

  const steps = [
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

  return (
    <section className="rounded-xl border border-[#dfe3e1] bg-white" aria-label="Multi-agent decision trace">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eceeed] px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-[#171918]">Multi-agent decision trace</h4>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <Check size={11} /> Evidence linked
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Derived from the recorded inputs and outputs for this plan.</p>
        </div>
        {requestId && <span className="font-mono text-[11px] text-gray-400">Run {requestId}</span>}
      </div>

      <ol className={`grid ${compact ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-5"}`}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.label}
              className={`relative min-w-0 px-4 py-3 ${
                compact
                  ? "border-b border-[#eceeed] last:border-b-0"
                  : "border-b border-[#eceeed] last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-full ${
                    step.human ? "bg-[#171918] text-white" : "bg-[#fff1ee] text-[#c33d28]"
                  }`}
                >
                  <Icon size={15} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-gray-400">{index + 1} · {step.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-600">{step.detail}</p>
                  <p className="mt-1 text-[11px] text-gray-400">Source: {step.evidence}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
