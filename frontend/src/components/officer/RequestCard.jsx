import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Ban, CheckCircle2, ChevronDown, ChevronUp, Clock3, MapPin, Route, ShieldAlert, SlidersHorizontal, Sparkles, TrainFront } from "lucide-react";
import { requestStatusStyles } from "../../utils/constants";
import Modal from "../common/Modal";
import AgentDecisionTrace from "../common/AgentDecisionTrace";
import PlanExplanation from "./PlanExplanation";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315b75] focus-visible:ring-offset-2";
const windowText = (start, end) => start && end ? `${start}–${end}` : "Not available";

function computeRevisedPreview(start, end, duration = 90) {
  if (!start || !end) return null;
  const toMinutes = (value) => { const [h, m] = value.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
  const toTime = (minutes) => { const value = ((minutes % 1440) + 1440) % 1440; return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; };
  let startMinutes = toMinutes(start);
  let endMinutes = toMinutes(end);
  if (endMinutes <= startMinutes) {
    endMinutes += 1440;
  }
  return { startTime: toTime(endMinutes + 15), endTime: toTime(endMinutes + 15 + duration) };
}

export default function RequestCard({ request, onApprove, onDecline, onRevision }) {
  const [showDetails, setShowDetails] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [decisionType, setDecisionType] = useState("APPROVED");
  const [selectedAltId, setSelectedAltId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [formError, setFormError] = useState("");

  const formatOptionType = (type, rank = 1) => {
    if (type === "RESCHEDULE") {
      return rank === 1 ? "SCHEDULE (Recommended)" : `SCHEDULE (Alternative ${rank})`;
    }
    return type;
  };

  const initialProhibited = request.raw?.prohibited_window || request.prohibitedWindow;
  const requestedStart = request.raw?.preferred_start_time || "19:00";
  const requestedEnd = request.raw?.preferred_end_time || "21:00";
  const recommendedBlock = request.recommendedBlock || request.agentPlan?.recommendedBlock;
  const duration = Number(request.raw?.estimated_duration_minutes || 120);

  const [prohibitedStartTime, setProhibitedStartTime] = useState(initialProhibited?.startTime || requestedStart);
  const [prohibitedEndTime, setProhibitedEndTime] = useState(initialProhibited?.endTime || requestedEnd);
  const isV2Plan = request.agentPlan?.schemaVersion === "2.0";
  const priorityScore = request.priorityScore ?? request.agentPlan?.priorityScore ?? (isV2Plan ? null : 75);
  const breakdown = request.agentPlan?.breakdown || {};
  const prohibitedWindow = request.raw?.prohibited_window || request.prohibitedWindow;
  const isVerifiedPlan = !isV2Plan || request.agentPlan?.verification?.passed === true;
  const isRevised = Boolean(prohibitedWindow || recommendedBlock?.isRevised || ["Revised Plan", "AI Processing", "REVISION_REQUIRED"].includes(request.status));
  const hasConflict = request.agentPlan?.verification?.passed === false || (!isRevised && Boolean(request.conflict || request.conflictingTrains?.length));
  const conflictingTrains = isRevised ? [] : (request.conflictingTrains || request.agentPlan?.conflictingTrains || []);
  const rawAlternatives = (request.alternatives?.length ? request.alternatives : (request.agentPlan?.alternatives || []))
    .filter((option) => option.type !== "REROUTE" || option.routeGeometry?.coordinates?.length > 1);

  const alternatives = (() => {
    if (isV2Plan) return rawAlternatives;
    const list = [...rawAlternatives];
    const types = list.map((option) => option.type);
    if (!types.includes("RESCHEDULE")) list.push({ id: "RESCHEDULE", type: "RESCHEDULE", description: `Move possession to ${windowText(recommendedBlock?.startTime || "22:15", recommendedBlock?.endTime || "23:45")}.`, trainImpact: "No passenger train disruption", priorityScore, rank: 1 });
    if (!types.includes("DELAY")) list.push({ id: "DELAY", type: "DELAY", description: "Hold the goods train at the preceding loop siding.", trainImpact: "15 min goods delay", priorityScore: Math.max((priorityScore || 75) - 12, 45), rank: 3 });
    return list;
  })();

  const selectedAlternative = alternatives.find((option) => option.id === selectedAltId || option.type === selectedAltId);
  const trackIds = request.raw?.track_ids?.length ? request.raw.track_ids : [request.raw?.track_id || request.agentPlan?.trackId].filter(Boolean);
  const revisedPreview = computeRevisedPreview(prohibitedStartTime, prohibitedEndTime, duration);
  const scoreTone = priorityScore == null ? "text-slate-500" : priorityScore >= 80 ? "text-rose-700" : priorityScore >= 65 ? "text-amber-700" : "text-emerald-700";
  const state = !isVerifiedPlan
    ? { label: "Verification failed", detail: "Approval is blocked until the planner produces a verified option.", icon: ShieldAlert, box: "border-red-200 bg-red-50", text: "text-red-900" }
    : isRevised
      ? { label: "Revised plan ready", detail: "A new window was generated outside the prohibited period.", icon: CheckCircle2, box: "border-blue-200 bg-blue-50", text: "text-blue-900" }
      : hasConflict
        ? { label: "Conflict needs review", detail: `${conflictingTrains.length || "Timetable"} conflict${conflictingTrains.length === 1 ? "" : "s"} found in the requested window.`, icon: AlertTriangle, box: "border-amber-200 bg-amber-50", text: "text-amber-950" }
        : { label: "Verified and ready", detail: "No timetable conflict was found for the recommended option.", icon: CheckCircle2, box: "border-emerald-200 bg-emerald-50", text: "text-emerald-950" };
  const StateIcon = state.icon;

  const openReview = (type, option = null) => {
    if (type === "APPROVED" && !isVerifiedPlan) return;
    setDecisionType(type);
    setFormError("");
    if (type === "APPROVED") {
      const selected = option || alternatives[0] || null;
      setSelectedAltId(selected?.id || selected?.type || null);
      setFeedback(selected ? `Approved under ${formatOptionType(selected.type, selected.rank || 1)}: ${selected.description}` : "");
    } else if (type === "REVISION_REQUIRED") {
      setSelectedAltId(null);
      setProhibitedStartTime(requestedStart);
      setProhibitedEndTime(requestedEnd);
      setFeedback(`Do not schedule possession between ${requestedStart} and ${requestedEnd}. Generate a new verified plan outside this period.`);
    } else {
      setSelectedAltId(null);
      setFeedback("");
    }
    setShowReviewModal(true);
  };

  const selectAlternative = (option) => {
    setSelectedAltId(option.id || option.type);
    setFeedback(`Approved under ${formatOptionType(option.type, option.rank || 1)}: ${option.description}`);
    setFormError("");
  };

  const submitReview = (event) => {
    event.preventDefault();
    if (decisionType === "APPROVED" && !isVerifiedPlan) return setFormError("This plan failed verification and cannot be approved.");
    if (decisionType === "APPROVED" && !selectedAltId) return setFormError("Select one operational option before approving.");
    if (!feedback.trim()) return setFormError("Add a short reason or instruction for this decision.");

    if (decisionType === "APPROVED") {
      onApprove?.(request, feedback, selectedAltId);
    } else if (decisionType === "REVISION_REQUIRED") {
      if (!prohibitedStartTime || !prohibitedEndTime) return setFormError("From and Until times are required.");
      if (prohibitedStartTime === prohibitedEndTime) return setFormError("Prohibited start and end cannot be identical.");
      onRevision?.(request, feedback, null, { startTime: prohibitedStartTime, endTime: prohibitedEndTime, reason: feedback });
    } else {
      onDecline?.(request, feedback);
    }
    setShowReviewModal(false);
  };

  const tracePlan = { ...request.agentPlan, trackId: request.raw?.track_id || request.agentPlan?.trackId, priorityScore, conflict: hasConflict, conflictingTrains, recommendedBlock, alternatives };

  return (
    <article className="overflow-hidden rounded-xl border border-[#d9e1e5] bg-white shadow-sm shadow-slate-900/[0.03]">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#60717d]"><span className={`rounded-full px-2.5 py-1 font-semibold ${requestStatusStyles[request.status] || "bg-blue-100 text-blue-800"}`}>{request.status}</span><span>{request.department}</span><span aria-hidden="true">·</span><span className="font-mono text-xs">{request.id}</span></div>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-[#172630]">{request.type}</h3>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#526570]"><span className="inline-flex items-center gap-1.5"><MapPin size={16} aria-hidden="true" />{trackIds.join(", ") || "Track not specified"}</span><span className="inline-flex items-center gap-1.5"><Clock3 size={16} aria-hidden="true" />{request.date} · {duration} min</span></div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-5 rounded-lg bg-[#f5f7f8] px-4 py-3 sm:block sm:text-right"><span className="text-sm font-medium text-[#687984] sm:block">Priority</span><span className={`text-2xl font-semibold ${scoreTone}`}>{priorityScore ?? "—"}<span className="text-sm font-normal text-slate-500">/100</span></span></div>
        </div>

        <div className={`mt-4 flex items-start gap-3 rounded-lg border p-3.5 ${state.box} ${state.text}`}><StateIcon size={20} className="mt-0.5 shrink-0" aria-hidden="true" /><div><p className="font-semibold">{state.label}</p><p className="mt-0.5 text-sm leading-5 opacity-80">{state.detail}</p></div></div>
        <div className="mt-4">
          <div className="rounded-lg border border-[#cce2d5] bg-[#f2faf5] p-3.5">
            <p className="text-sm font-medium text-emerald-800">Recommended window</p>
            <p className="mt-1 font-mono text-lg font-semibold text-emerald-950">{windowText(recommendedBlock?.startTime, recommendedBlock?.endTime)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-[#edf0f1] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setShowDetails((open) => !open)} aria-expanded={showDetails} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#315b75] hover:bg-[#edf4f7] ${focusRing}`}>{showDetails ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}{showDetails ? "Hide evidence" : "View evidence and agent explanation"}</button>
          <div className="grid grid-cols-3 gap-2 sm:flex"><button type="button" onClick={() => openReview("REJECTED")} className={`min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 ${focusRing}`}>Decline</button><button type="button" onClick={() => openReview("REVISION_REQUIRED")} className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 ${focusRing}`}><SlidersHorizontal size={16} aria-hidden="true" />Modify</button><button type="button" onClick={() => openReview("APPROVED")} disabled={!isVerifiedPlan || alternatives.length === 0} title={!isVerifiedPlan ? "Verification must pass before approval" : undefined} className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white ${focusRing} ${isVerifiedPlan && alternatives.length ? "bg-[#315b75] hover:bg-[#25485e]" : "cursor-not-allowed bg-slate-300"}`}><CheckCircle2 size={16} aria-hidden="true" />Approve</button></div>
        </div>
      </div>

      {showDetails && <div className="space-y-4 border-t border-[#dfe6e9] bg-[#f8fafb] p-4 sm:p-5">
        <PlanExplanation details={request.agentPlan?.explanationDetails} requestedWindow={{ startTime: requestedStart, endTime: requestedEnd }} recommendedBlock={recommendedBlock} conflicts={conflictingTrains} />
        <section aria-labelledby={`options-${request.id}`} className="rounded-xl border border-[#dce4e7] bg-white p-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><h4 id={`options-${request.id}`} className="font-semibold text-[#172630]">Ranked operational options</h4><p className="mt-1 text-sm text-[#667680]">Only verified, feasible options are shown.</p></div><span className="text-sm font-medium text-[#526570]">{alternatives.length} option{alternatives.length === 1 ? "" : "s"}</span></div>
          {alternatives.length ? (
            <div className="mt-3 space-y-2">
              {alternatives.map((option, index) => (
                <div key={option.id || option.type || index} className="rounded-lg border border-[#dce4e7] bg-white p-2 hover:border-[#8eabbc]">
                  <button type="button" onClick={() => openReview("APPROVED", option)} disabled={!isVerifiedPlan} className={`flex min-h-11 w-full flex-col gap-2 rounded-md p-2 text-left hover:bg-[#f7fafb] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-row sm:items-center sm:justify-between ${focusRing}`}>
                    <span className="flex min-w-0 items-start gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e7f0f4] text-xs font-bold text-[#315b75]">{option.rank || index + 1}</span><span><span className="block text-sm font-semibold text-[#203746]">{formatOptionType(option.type, option.rank || index + 1)}</span><span className="mt-0.5 block text-sm leading-5 text-[#5f707b]">{option.description}</span></span></span>
                    <span className="shrink-0 text-sm font-medium text-[#536a77]">{option.trainImpact || (option.delayMinutes === 0 ? "No delay" : `+${option.delayMinutes || 0} min`)}</span>
                  </button>
                  {option.type === "REROUTE" && option.routeGeometry?.coordinates?.length > 1 && trackIds[0] && (
                    <Link
                      to={`/officer/live-map?preview=reroute&track=${encodeURIComponent(trackIds[0])}&request=${encodeURIComponent(request.id)}&extraKm=${encodeURIComponent(String(option.trainImpact || option.description).match(/\+?(\d+(?:\.\d+)?)\s*km/i)?.[1] || 14)}&delay=${encodeURIComponent(option.delayMinutes || 20)}`}
                      state={{ trackId: trackIds[0], requestId: request.id, detourAlternative: option }}
                      className={`mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-violet-50 px-3 text-sm font-semibold text-violet-800 hover:bg-violet-100 ${focusRing}`}
                    >
                      <MapPin size={16} aria-hidden="true" /> Preview detour on map
                    </Link>
                  )}
                </div>
              ))}
            </div>
          ) : <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">No verified operational options are available.</p>}
        </section>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[#dce4e7] bg-white p-4" aria-labelledby={`factors-${request.id}`}><h4 id={`factors-${request.id}`} className="font-semibold text-[#172630]">Priority factors</h4><dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">{[["Safety", breakdown.safety], ["Urgency", breakdown.urgency], ["Failure probability", breakdown.failureProbability], ["Asset condition", breakdown.criticality], ["Train impact", breakdown.trainImpact], ["Asset availability", breakdown.assetAvailability]].map(([label, value]) => <div key={label}><dt className="text-[#667680]">{label}</dt><dd className="mt-0.5 font-semibold text-[#263a47]">{value ?? "—"}{value != null ? "%" : ""}</dd></div>)}</dl></section>
          <section className="rounded-xl border border-[#dce4e7] bg-white p-4" aria-labelledby={`traffic-${request.id}`}><h4 id={`traffic-${request.id}`} className="font-semibold text-[#172630]">Timetable evidence</h4>{conflictingTrains.length ? <ul className="mt-3 space-y-2">{conflictingTrains.map((train, index) => <li key={train.trainNo || index} className="flex items-start gap-2 text-sm text-[#536570]"><TrainFront size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" /><span><strong className="font-semibold text-[#263a47]">{train.trainName || `Train ${train.trainNo}`}</strong><br />{windowText(train.arrival || train.arrivalTime, train.departure || train.departureTime)}</span></li>)}</ul> : <p className="mt-2 text-sm leading-5 text-[#5f707b]">No conflicting train movement is listed for this plan.</p>}</section>
        </div>
        <section><button type="button" onClick={() => setShowTrace((open) => !open)} aria-expanded={showTrace} className={`flex min-h-11 w-full items-center justify-between rounded-lg border border-[#dce4e7] bg-white px-4 text-left text-sm font-semibold text-[#29485e] hover:bg-[#f4f8fa] ${focusRing}`}><span>Agent handoff record</span>{showTrace ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}</button>{showTrace && <div className="mt-2"><AgentDecisionTrace compact requestId={request.id} trackIds={trackIds} requestedWindow={{ startTime: requestedStart, endTime: requestedEnd }} agentPlan={tracePlan} status={request.status} /></div>}</section>
      </div>}

      {showReviewModal && <Modal title={decisionType === "APPROVED" ? "Approve a plan" : decisionType === "REVISION_REQUIRED" ? "Request a modified plan" : "Decline request"} onClose={() => setShowReviewModal(false)} maxWidth="max-w-xl">
        <form onSubmit={submitReview} className="max-h-[75vh] overflow-y-auto pr-1 text-base"><p className="mb-5 text-sm leading-5 text-[#61727d]">Case <span className="font-mono font-semibold text-[#263a47]">{request.id}</span>. Review the information below before confirming.</p>
          {decisionType === "APPROVED" && <fieldset><legend className="font-semibold text-[#172630]">Operational option</legend><p className="mt-1 text-sm text-[#657680]">Choose one option. This selection becomes part of the decision record.</p><div className="mt-3 space-y-2">{alternatives.map((option, index) => { const id = option.id || option.type; const selected = selectedAltId === id; return <label key={id || index} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${selected ? "border-[#315b75] bg-[#eef5f8]" : "border-[#dce4e7] hover:bg-[#f8fafb]"}`}><input type="radio" name={`alternative-${request.id}`} value={id} checked={selected} onChange={() => selectAlternative(option)} className="mt-1 size-4 accent-[#315b75]" /><span><span className="block text-sm font-semibold text-[#203746]">{formatOptionType(option.type, option.rank || index + 1)}</span><span className="mt-0.5 block text-sm leading-5 text-[#5f707b]">{option.description}</span></span></label>; })}</div></fieldset>}
          {decisionType === "REVISION_REQUIRED" && (
            <fieldset className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <legend className="px-1 font-semibold text-amber-950">Prohibited blackout period</legend>
              <p className="text-sm leading-5 text-amber-900">
                The planner will search for a verified possession window outside these hours.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-[#3c4d58]">
                  From
                  <input
                    type="time"
                    value={prohibitedStartTime}
                    onChange={(event) => {
                      setProhibitedStartTime(event.target.value);
                      setFeedback(`Do not schedule possession between ${event.target.value} and ${prohibitedEndTime}. Generate a new verified plan outside this period.`);
                      setFormError("");
                    }}
                    className={`mt-1 min-h-11 w-full rounded-lg border border-[#bfcbd1] bg-white px-3 font-mono text-base ${focusRing}`}
                    required
                  />
                </label>
                <label className="text-sm font-medium text-[#3c4d58]">
                  Until
                  <input
                    type="time"
                    value={prohibitedEndTime}
                    onChange={(event) => {
                      setProhibitedEndTime(event.target.value);
                      setFeedback(`Do not schedule possession between ${prohibitedStartTime} and ${event.target.value}. Generate a new verified plan outside this period.`);
                      setFormError("");
                    }}
                    className={`mt-1 min-h-11 w-full rounded-lg border border-[#bfcbd1] bg-white px-3 font-mono text-base ${focusRing}`}
                    required
                  />
                </label>
              </div>
              {revisedPreview && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-white p-3 text-sm text-emerald-900">
                  <Sparkles size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>
                    <strong>Earliest search point:</strong> {windowText(revisedPreview.startTime, revisedPreview.endTime)}. The agent will verify constraints after submission.
                  </span>
                </div>
              )}
            </fieldset>
          )}
          {decisionType === "REJECTED" && <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"><Ban size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span>This closes the request. Give the requesting team a clear reason below.</span></div>}
          <label htmlFor={`${request.id}-feedback`} className="mt-5 block text-sm font-semibold text-[#263a47]">Reason or instructions</label><textarea id={`${request.id}-feedback`} rows={4} value={feedback} onChange={(event) => { setFeedback(event.target.value); setFormError(""); }} placeholder={decisionType === "REJECTED" ? "Explain why this request cannot proceed…" : "Add instructions for the maintenance and control teams…"} className={`mt-1 w-full rounded-lg border border-[#bfcbd1] p-3 text-base leading-6 ${focusRing}`} aria-describedby={formError ? `${request.id}-form-error` : undefined} required />{formError && <p id={`${request.id}-form-error`} role="alert" className="mt-2 flex items-center gap-2 text-sm font-medium text-red-700"><AlertTriangle size={16} aria-hidden="true" />{formError}</p>}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowReviewModal(false)} className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-[#526570] hover:bg-[#f0f4f5] ${focusRing}`}>Cancel</button><button type="submit" disabled={decisionType === "APPROVED" && (!selectedAltId || !isVerifiedPlan)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white ${focusRing} ${decisionType === "REVISION_REQUIRED" ? "bg-amber-700 hover:bg-amber-800" : decisionType === "REJECTED" ? "bg-red-700 hover:bg-red-800" : selectedAltId && isVerifiedPlan ? "bg-[#315b75] hover:bg-[#25485e]" : "cursor-not-allowed bg-slate-300"}`}>{decisionType === "APPROVED" ? <CheckCircle2 size={17} aria-hidden="true" /> : decisionType === "REVISION_REQUIRED" ? <Route size={17} aria-hidden="true" /> : <Ban size={17} aria-hidden="true" />}{decisionType === "APPROVED" ? `Approve ${formatOptionType(selectedAlternative?.type, selectedAlternative?.rank || 1) || "selected option"}` : decisionType === "REVISION_REQUIRED" ? "Generate revised plan" : "Confirm decline"}</button></div>
        </form>
      </Modal>}
    </article>
  );
}
