import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  Eye,
  ShieldCheck,
  Sparkles,
  TrainFront,
  UserRoundCheck,
} from "lucide-react";

function formatWindow(window) {
  if (!window?.startTime || !window?.endTime) return "Not available";
  return `${window.startTime}–${window.endTime}`;
}

export default function PlanExplanation({ details, requestedWindow, recommendedBlock, conflicts = [] }) {
  if (!details) return null;

  const isModelGenerated = details.mode === "OPENROUTER";

  return (
    <section className="overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50" aria-label="Visual plan explanation">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-indigo-100 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <Sparkles size={15} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-500">Explanation agent</p>
            <h4 className="mt-0.5 text-sm font-semibold text-slate-950">{details.headline}</h4>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${
          isModelGenerated
            ? "border-violet-200 bg-violet-100 text-violet-800"
            : "border-slate-200 bg-slate-100 text-slate-600"
        }`}>
          {isModelGenerated ? <Bot size={11} /> : <ShieldCheck size={11} />}
          {isModelGenerated ? `OpenRouter · ${details.model || "DeepSeek"}` : "Verified fallback"}
        </span>
      </div>

      <div className="px-4 py-4">
        <div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              <CheckCircle2 size={12} /> Recommended
            </div>
            <p className="mt-1.5 font-mono text-base font-bold text-emerald-950">{formatWindow(recommendedBlock)}</p>
            <p className="mt-1 text-[10px] text-emerald-800">{recommendedBlock?.date || "Planning date"} · independently verified</p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-700">{details.summary}</p>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-white/80 bg-white/80 p-3 shadow-sm">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              <Eye size={12} /> Why it won
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-4 text-slate-600">
              {(details.whyThisPlan || []).map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>

          <div className="rounded-lg border border-white/80 bg-white/80 p-3 shadow-sm">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              <ShieldCheck size={12} /> Risks avoided
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-4 text-slate-600">
              {(details.risksAvoided || []).map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>

          <div className="rounded-lg border border-white/80 bg-white/80 p-3 shadow-sm">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
              <UserRoundCheck size={12} /> Officer confirms
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-4 text-slate-600">
              {(details.officerChecks || []).map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
