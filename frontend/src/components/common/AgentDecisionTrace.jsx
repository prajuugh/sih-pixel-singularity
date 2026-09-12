import {
  ArrowRight,
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
    <section className="overflow-hidden rounded-xl border border-[#dfe3e1] bg-[#fbfcfb]" aria-label="Multi-agent decision trace">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e7eae7] px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-[#171918]">Decision ledger</h4>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#c8d8e1] bg-[#edf4f7] px-2 py-0.5 text-[11px] font-semibold text-[#315b75]">
              <Check size={10} /> Trace complete
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">What each agent received, checked and handed forward.</p>
        </div>
        {requestId && <span className="font-mono text-xs font-semibold text-gray-400">Case {requestId}</span>}
      </div>

      <div className={compact ? "overflow-x-auto" : ""}>
      <ol className={`grid ${compact ? "min-w-[670px] grid-cols-5" : "grid-cols-1 lg:grid-cols-5"}`}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.label}
              className="relative min-w-0 border-r border-[#e7eae7] px-3 py-3 last:border-r-0"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full ${
                    step.human ? "bg-[#315b75] text-white" : "border border-[#c8d8e1] bg-[#edf4f7] text-[#315b75]"
                  }`}
                >
                  <Icon size={13} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-gray-400">{index + 1} · {step.label}</p>
                  <p className="mt-0.5 text-xs font-semibold text-gray-900">{step.title}</p>
                  <p className="mt-1 text-xs leading-4 text-gray-600">{step.detail}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-gray-400">From {step.evidence}</p>
                </div>
              </div>
              {index < steps.length - 1 && <ArrowRight size={12} className="absolute -right-1.5 top-5 z-10 hidden bg-[#fbfcfb] text-gray-300 lg:block" />}
            </li>
          );
        })}
      </ol>
      </div>
    </section>
  );
}
