import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Ban, Camera, CheckCircle2, ChevronDown, ChevronUp, Clock3, Eye, GitCompare, MapPin, Package, Route, ShieldAlert, ShieldCheck, SlidersHorizontal, Sparkles, TrainFront, Users } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { requestStatusStyles } from "../../utils/constants";
import Modal from "../common/Modal";
import AgentDecisionTrace from "../common/AgentDecisionTrace";
import PlanExplanation from "./PlanExplanation";
import { getDelayedTrainsForOption } from "../../utils/delayedTrainsHelper";
import { evaluateDiversionPassivity } from "../../utils/trainTractionHelper";
import { evaluateMandatoryStations } from "../../utils/stationHaltHelper";
import { getRequestTrafficType, isFreightTrain } from "../../utils/trafficClassification";

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

export default function RequestCard({ request, onApprove, onDecline, onRevision, onVerifyCompleted }) {
  const { user } = useAuth();
  const userRole = (user?.role || "").toLowerCase();
  const canCertify = userRole === "officer" || userRole === "admin";

  const [showDetails, setShowDetails] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [decisionType, setDecisionType] = useState("APPROVED");
  const [selectedAltId, setSelectedAltId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [formError, setFormError] = useState("");
  const [expandedDelayedOpt, setExpandedDelayedOpt] = useState(null);

  const formatOptionType = (type, rank = 1) => {
    if (type === "RESCHEDULE") {
      return rank === 1 ? "SCHEDULE (Recommended)" : `SCHEDULE (Alternative ${rank})`;
    }
    if (type === "REROUTE" || type === "DIVERSION") {
      return `DIVERSION (Alternative ${rank})`;
    }
    if (type === "DELAY") {
      return `REGULATION / DELAY (Alternative ${rank})`;
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
    .filter((option) => (option.type !== "REROUTE" && option.type !== "DIVERSION") || option.routeGeometry?.coordinates?.length > 1);

  const trafficType = getRequestTrafficType(request);
  const isGoodsTraffic = trafficType === "GOODS";

  // Identify any diversion option and check if it's passive due to electric trains or skipped mandatory passenger halts
  const diversionRaw = rawAlternatives.find((opt) => opt.type === "REROUTE" || opt.type === "DIVERSION");
  const diversionPassivity = diversionRaw
    ? evaluateDiversionPassivity(diversionRaw, request, conflictingTrains)
    : { isPassive: false, electricTrains: [], reason: "" };
  const isElectricDiversionBlocked = diversionPassivity.isPassive;

  const mandatoryHaltsEval = diversionRaw
    ? evaluateMandatoryStations(diversionRaw, request, conflictingTrains)
    : { skipsMandatoryStops: false, missedStops: [], servedStops: [], reason: "" };
  const isMandatoryHaltBlocked = mandatoryHaltsEval.skipsMandatoryStops;

  const isDiversionBlocked = isElectricDiversionBlocked || isMandatoryHaltBlocked;

  const isOptionBlocked = (opt) => {
    if (!opt || (opt.type !== "REROUTE" && opt.type !== "DIVERSION")) return false;
    return (
      evaluateDiversionPassivity(opt, request, conflictingTrains).isPassive ||
      evaluateMandatoryStations(opt, request, conflictingTrains).skipsMandatoryStops
    );
  };

  const alternatives = (() => {
    // When electric trains or skipped mandatory halts are involved, do NOT offer diversion as an operational option to choose from
    const filteredRaw = rawAlternatives.filter((opt) => {
      if (opt.type === "REROUTE" || opt.type === "DIVERSION") {
        return !isOptionBlocked(opt);
      }
      return true;
    });

    if (isV2Plan) return filteredRaw;
    const list = [...filteredRaw];
    const types = list.map((option) => option.type);
    if (!types.includes("RESCHEDULE")) list.push({
      id: "RESCHEDULE",
      type: "RESCHEDULE",
      description: `Move possession to ${windowText(recommendedBlock?.startTime || "22:15", recommendedBlock?.endTime || "23:45")}.`,
      trainImpact: isGoodsTraffic ? "Zero freight train detention" : "No passenger train disruption",
      priorityScore,
      rank: 1
    });
    if (!types.includes("DELAY")) list.push({
      id: "DELAY",
      type: "DELAY",
      description: isGoodsTraffic
        ? "Regulate freight rake at preceding loop siding / goods line."
        : "Hold the train at the preceding loop siding.",
      trainImpact: isGoodsTraffic ? "20 min freight loop regulation" : "15 min train delay",
      priorityScore: Math.max((priorityScore || 75) - 12, 45),
      rank: 2
    });
    return list;
  })();

  const selectedAlternative = alternatives.find((option) => option.id === selectedAltId || option.type === selectedAltId);
  const trackIds = request.raw?.track_ids?.length ? request.raw.track_ids : [request.raw?.track_id || request.agentPlan?.trackId].filter(Boolean);
  const revisedPreview = computeRevisedPreview(prohibitedStartTime, prohibitedEndTime, duration);
  const completionProof = request.completionProof || request.raw?.completion_proof;
  const isWorkCompleted = Boolean(
    completionProof ||
    ["COMPLETED", "WORK_COMPLETED", "Completed"].includes(request.status) ||
    ["COMPLETED", "WORK_COMPLETED", "Completed"].includes(request.raw?.status)
  );
  const isVerifiedWork = Boolean(
    completionProof?.verified_by_officer ||
    request.status === "VERIFIED" ||
    request.raw?.status === "VERIFIED"
  );
  const isApproved = Boolean(
    ["APPROVED", "Approved"].includes(request.status) ||
    ["APPROVED", "Approved"].includes(request.raw?.status)
  );
  const isDeclined = Boolean(
    ["DECLINED", "Declined", "REJECTED", "Rejected"].includes(request.status) ||
    ["DECLINED", "Declined", "REJECTED", "Rejected"].includes(request.raw?.status)
  );

  const state = isDeclined
    ? {
        label: "Request Declined & Closed",
        detail: request.reason || request.raw?.officer_feedback || "This possession request was declined by the controlling officer. No corridor possession is sanctioned.",
        icon: Ban,
        box: "border-rose-200 bg-rose-50",
        text: "text-rose-950",
      }
    : !isVerifiedPlan
      ? { label: "Verification failed", detail: "Approval is blocked until the planner produces a verified option.", icon: ShieldAlert, box: "border-red-200 bg-red-50", text: "text-red-900" }
      : isRevised
        ? { label: "Revised plan ready", detail: "A new window was generated outside the prohibited period.", icon: CheckCircle2, box: "border-blue-200 bg-blue-50", text: "text-blue-900" }
        : hasConflict
          ? { label: "Conflict needs review", detail: `${conflictingTrains.length || "Timetable"} conflict${conflictingTrains.length === 1 ? "" : "s"} found in the requested window.`, icon: AlertTriangle, box: "border-amber-200 bg-amber-50", text: "text-amber-950" }
          : { label: "Verified and ready", detail: "No timetable conflict was found for the recommended option.", icon: CheckCircle2, box: "border-emerald-200 bg-emerald-50", text: "text-emerald-950" };
  const StateIcon = state.icon;

  const openReview = (type, option = null) => {
    if (isDeclined) return;
    if (type === "APPROVED" && !isVerifiedPlan) return;
    // Passive or mandatory-skipping diversion options cannot be approved
    if (option && isOptionBlocked(option)) {
      return;
    }
    setDecisionType(type);
    setFormError("");
    if (type === "APPROVED") {
      const validOptions = alternatives.filter((opt) => !isOptionBlocked(opt));
      const selected = (option && !isOptionBlocked(option))
        ? option
        : (validOptions[0] || alternatives[0] || null);
      setSelectedAltId(selected?.id || selected?.type || null);
      if (selected) {
        const delayed = getDelayedTrainsForOption(selected, request);
        const delayedSummary = delayed.length > 0
          ? ` [Regulated movements: ${delayed.map((t) => `${t.trainNo} ${t.trainName} (+${t.delayMinutes}m)`).join(", ")}]`
          : "";
        setFeedback(`Approved under ${formatOptionType(selected.type, selected.rank || 1)}: ${selected.description}${delayedSummary}`);
      } else {
        setFeedback("");
      }
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
    if (isOptionBlocked(option)) {
      const passivity = evaluateDiversionPassivity(option, request, conflictingTrains);
      const mandatory = evaluateMandatoryStations(option, request, conflictingTrains);
      setFormError(mandatory.reason || passivity.reason || "This diversion option is passive and cannot be selected.");
      return;
    }
    setSelectedAltId(option.id || option.type);
    const delayed = getDelayedTrainsForOption(option, request);
    const delayedSummary = delayed.length > 0
      ? ` [Regulated movements: ${delayed.map((t) => `${t.trainNo} ${t.trainName} (+${t.delayMinutes}m)`).join(", ")}]`
      : "";
    setFeedback(`Approved under ${formatOptionType(option.type, option.rank || 1)}: ${option.description}${delayedSummary}`);
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

  const handleVerifyWork = async () => {
    if (!canCertify) {
      alert(`Access Restricted: You are currently signed in as "${user?.name || user?.username || 'Team'}" (${user?.role?.toUpperCase() || 'TEAMS'}).\n\nUnder Railway safety rules, only an authorized Traffic Officer or System Admin can certify track restoration. Please log out and sign in with an Officer or Admin account.`);
      return;
    }
    setVerifying(true);
    try {
      const note = feedback.trim() || "Field work completion inspected, photographic evidence verified, and track certified safe for normal traffic operations.";
      if (onVerifyCompleted) {
        await onVerifyCompleted(request, note);
      } else if (onApprove) {
        await onApprove(request, note, "VERIFIED");
      }
      setShowProofModal(false);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-xl border border-[#d9e1e5] bg-white shadow-sm shadow-slate-900/[0.03]">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#60717d]">
              {isVerifiedWork ? (
                <span className="rounded-full px-2.5 py-1 font-semibold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                  <ShieldCheck size={13} /> Verified & Restored
                </span>
              ) : isWorkCompleted ? (
                <span className="rounded-full px-2.5 py-1 font-semibold bg-teal-100 text-teal-800 inline-flex items-center gap-1">
                  <Camera size={13} /> Work Completed · Verification Pending
                </span>
              ) : (
                <span className={`rounded-full px-2.5 py-1 font-semibold ${requestStatusStyles[request.status] || "bg-blue-100 text-blue-800"}`}>
                  {request.status}
                </span>
              )}
              <span>{request.department}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-xs">{request.id}</span>

              {/* Traffic Classification Badge */}
              {trafficType === "GOODS" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                  <Package size={13} className="text-amber-700" /> Goods / Freight
                </span>
              )}
              {trafficType === "PASSENGER" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-900">
                  <Users size={13} className="text-blue-700" /> Passenger
                </span>
              )}
              {trafficType === "MIXED" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-xs font-bold text-purple-900">
                  <GitCompare size={13} className="text-purple-700" /> Mixed Traffic
                </span>
              )}
            </div>
            <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-[#172630]">{request.type}</h3>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#526570]"><span className="inline-flex items-center gap-1.5"><MapPin size={16} aria-hidden="true" />{trackIds.join(", ") || "Track not specified"}</span><span className="inline-flex items-center gap-1.5"><Clock3 size={16} aria-hidden="true" />{request.date} · {duration} min</span></div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-5 rounded-lg bg-[#f5f7f8] px-4 py-3 sm:block sm:text-right"><span className="text-sm font-medium text-[#687984] sm:block">Priority</span><span className={`text-2xl font-semibold ${scoreTone}`}>{priorityScore ?? "—"}<span className="text-sm font-normal text-slate-500">/100</span></span></div>
        </div>

        {isWorkCompleted ? (
          <div className={`mt-4 flex items-start gap-3 rounded-lg border p-3.5 ${isVerifiedWork ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-teal-200 bg-teal-50 text-teal-950"}`}>
            <Camera size={20} className={`mt-0.5 shrink-0 ${isVerifiedWork ? "text-emerald-700" : "text-teal-700"}`} aria-hidden="true" />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-semibold">
                  {isVerifiedWork ? "Work Completion Verified & Track Certified Safe" : "Field Work Completed · Clearance Proof Submitted"}
                </p>
                <span className="text-xs font-mono text-teal-800">
                  {completionProof?.completed_at ? new Date(completionProof.completed_at).toLocaleString("en-IN") : ""}
                </span>
              </div>
              <p className="mt-0.5 text-sm leading-5 opacity-90">
                {isVerifiedWork
                  ? "Officer has certified line restoration. Safety clearance and track restoration logged in permanent audit trail."
                  : "Engineering maintenance crew marked block completed and submitted site photographic evidence for officer restoration sign-off."}
              </p>
            </div>
          </div>
        ) : (
          <div className={`mt-4 flex items-start gap-3 rounded-lg border p-3.5 ${state.box} ${state.text}`}>
            <StateIcon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div><p className="font-semibold">{state.label}</p><p className="mt-0.5 text-sm leading-5 opacity-80">{state.detail}</p></div>
          </div>
        )}

        {/* Field Work Completion Evidence Showcase */}
        {isWorkCompleted && completionProof && (
          <div className="mt-4 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/70 via-emerald-50/50 to-white p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-teal-200/70 pb-2.5">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-teal-700" />
                <h4 className="font-semibold text-sm text-teal-950">Field Work Completion & Site Clearance Evidence</h4>
              </div>
              <div className="flex items-center gap-2">
                {isVerifiedWork ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <ShieldCheck size={13} /> Line Certified Restored
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    Verification Pending
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row items-start gap-4">
              {completionProof.photo ? (
                <button
                  type="button"
                  onClick={() => setShowProofModal(true)}
                  className="group relative cursor-pointer overflow-hidden rounded-lg border-2 border-teal-300/80 shadow-sm shrink-0 w-full sm:w-48 h-32 bg-slate-900 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-teal-500"
                  title="Click to inspect high-resolution site photo"
                >
                  <img
                    src={completionProof.photo}
                    alt="Site work completion evidence"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-semibold text-xs">
                    <Eye size={16} /> Inspect Photo
                  </div>
                  <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-[10px] text-white px-1.5 py-0.5 rounded font-mono">
                    Full view
                  </span>
                </button>
              ) : (
                <div className="w-full sm:w-48 h-32 rounded-lg border border-dashed border-teal-300 bg-teal-50/50 flex flex-col items-center justify-center text-xs text-teal-800">
                  <Camera size={24} className="opacity-40 mb-1" />
                  No site photo attached
                </div>
              )}

              <div className="flex-1 space-y-2.5 text-xs w-full">
                <div>
                  <span className="text-teal-900 font-bold block uppercase tracking-wider text-[10px]">
                    Field Clearance Declaration & Notes
                  </span>
                  <p className="mt-1 text-slate-800 bg-white/90 p-2.5 rounded-lg border border-teal-200/80 leading-relaxed font-sans text-xs italic">
                    "{completionProof.notes || "All engineering maintenance work finished. Track cleared of all personnel, tools, and temporary speed restrictions lifted."}"
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white/60 p-2 rounded-lg border border-teal-100">
                  <div>
                    <span className="text-slate-500">Completed by:</span>{" "}
                    <strong className="text-slate-900">{completionProof.completed_by || request.department || "Field Team"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Submitted at:</span>{" "}
                    <strong className="text-slate-900">
                      {completionProof.completed_at ? new Date(completionProof.completed_at).toLocaleString("en-IN") : "Recorded"}
                    </strong>
                  </div>
                  {completionProof.photo_name && (
                    <div className="sm:col-span-2 text-slate-500">
                      <span>Attachment:</span> <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[10px]">{completionProof.photo_name}</code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isDeclined && (
          <div className="mt-4">
            <div className="rounded-lg border border-[#cce2d5] bg-[#f2faf5] p-3.5">
              <p className="text-sm font-medium text-emerald-800">Recommended window</p>
              <p className="mt-1 font-mono text-lg font-semibold text-emerald-950">{windowText(recommendedBlock?.startTime, recommendedBlock?.endTime)}</p>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col-reverse gap-2 border-t border-[#edf0f1] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setShowDetails((open) => !open)} aria-expanded={showDetails} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#315b75] hover:bg-[#edf4f7] ${focusRing}`}>{showDetails ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}{showDetails ? "Hide evidence" : "View evidence and agent explanation"}</button>
          
          {isWorkCompleted ? (
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {completionProof?.photo && (
                <button
                  type="button"
                  onClick={() => setShowProofModal(true)}
                  className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3.5 text-sm font-semibold text-teal-900 hover:bg-teal-100 ${focusRing}`}
                >
                  <Eye size={16} /> Inspect Photo Proof
                </button>
              )}
              {!isVerifiedWork ? (
                <button
                  type="button"
                  disabled={verifying}
                  onClick={handleVerifyWork}
                  className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 text-sm font-semibold text-white shadow-xs ${focusRing}`}
                >
                  <ShieldCheck size={17} /> {verifying ? "Verifying..." : "Verify & Certify Track Clear"}
                </button>
              ) : (
                <div className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-300 px-3.5 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 size={16} className="text-emerald-600" /> Track Safe & Restored
                </div>
              )}
            </div>
          ) : isDeclined ? (
            <div className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-rose-50 border border-rose-300 px-4 text-sm font-semibold text-rose-800">
              <Ban size={17} className="text-rose-600" />
              Request Declined
            </div>
          ) : isApproved ? (
            <div className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-300 px-4 text-sm font-semibold text-emerald-800">
              <CheckCircle2 size={17} className="text-emerald-600" />
              Approved & Released
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:flex">
              <button type="button" onClick={() => openReview("REJECTED")} className={`min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 ${focusRing}`}>Decline</button>
              <button type="button" onClick={() => openReview("REVISION_REQUIRED")} className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 ${focusRing}`}><SlidersHorizontal size={16} aria-hidden="true" />Modify</button>
              <button type="button" onClick={() => openReview("APPROVED")} disabled={!isVerifiedPlan || alternatives.length === 0} title={!isVerifiedPlan ? "Verification must pass before approval" : undefined} className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white ${focusRing} ${isVerifiedPlan && alternatives.length ? "bg-[#315b75] hover:bg-[#25485e]" : "cursor-not-allowed bg-slate-300"}`}><CheckCircle2 size={16} aria-hidden="true" />Approve</button>
            </div>
          )}
        </div>
      </div>

      {showDetails && <div className="space-y-4 border-t border-[#dfe6e9] bg-[#f8fafb] p-4 sm:p-5">
        <PlanExplanation details={request.agentPlan?.explanationDetails} requestedWindow={{ startTime: requestedStart, endTime: requestedEnd }} recommendedBlock={recommendedBlock} conflicts={conflictingTrains} />
        <section aria-labelledby={`options-${request.id}`} className="rounded-xl border border-[#dce4e7] bg-white p-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><h4 id={`options-${request.id}`} className="font-semibold text-[#172630]">Ranked operational options</h4><p className="mt-1 text-sm text-[#667680]">Only verified, feasible options are shown.</p></div><span className="text-sm font-medium text-[#526570]">{alternatives.length} option{alternatives.length === 1 ? "" : "s"}</span></div>
          {alternatives.length ? (
            <div className="mt-3 space-y-2">
              {alternatives.map((option, index) => {
                const optDelayed = getDelayedTrainsForOption(option, request);
                const optId = option.id || option.type || index;
                const isExpanded = expandedDelayedOpt === optId;
                const isDiversionType = option.type === "REROUTE" || option.type === "DIVERSION";

                return (
                  <div
                    key={optId}
                    className="rounded-lg border border-[#dce4e7] bg-white p-2 hover:border-[#8eabbc] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => openReview("APPROVED", option)}
                      disabled={!isVerifiedPlan || isDeclined}
                      title={isDeclined ? "Request is declined and closed" : (!isVerifiedPlan ? "Verification must pass before approval" : undefined)}
                      className={`flex min-h-11 w-full flex-col gap-2 rounded-md p-2 text-left hover:bg-[#f7fafb] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-row sm:items-center sm:justify-between ${focusRing}`}
                    >
                      <span className="flex min-w-0 items-start gap-3">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e7f0f4] text-xs font-bold text-[#315b75]">
                          {option.rank || index + 1}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-[#203746]">
                            {formatOptionType(option.type, option.rank || index + 1)}
                          </span>
                          <span className="mt-0.5 block text-sm leading-5 text-[#5f707b]">
                            {option.description?.replace(/reroute/gi, "diversion")}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-medium text-[#536a77]">
                        {option.trainImpact?.replace(/detour/gi, "diversion") || (option.delayMinutes === 0 ? "No delay" : `+${option.delayMinutes || 0} min`)}
                      </span>
                    </button>

                    {optDelayed.length > 0 ? (
                      <div className="mt-1 border-t border-[#edf1f3] pt-1.5 px-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                            <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                            {optDelayed.length} train{optDelayed.length > 1 ? "s" : ""} getting delayed (+{option.delayMinutes || 10}m)
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedDelayedOpt(isExpanded ? null : optId);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#315b75] hover:text-[#1d3d52]"
                          >
                            {isExpanded ? <>Hide delayed trains <ChevronUp size={13} /></> : <>View delayed trains ({optDelayed.length}) <ChevronDown size={13} /></>}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-xs">
                            <p className="font-semibold text-amber-950">Delayed / Regulated Movements:</p>
                            {optDelayed.map((train, tIdx) => (
                              <div key={train.trainNo || tIdx} className="rounded border border-amber-200/80 bg-white p-2 shadow-2xs">
                                <div className="flex flex-wrap items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 font-medium text-slate-900">
                                    <TrainFront size={14} className="text-[#315b75]" />
                                    <span className="font-bold">{train.trainNo}</span>
                                    <span>{train.trainName}</span>
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{train.type}</span>
                                    {train.traction && (
                                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">{train.traction}</span>
                                    )}
                                  </div>
                                  <span className="font-semibold text-rose-700">+{train.delayMinutes} min</span>
                                </div>
                                <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-slate-600">
                                  <span>Scheduled: {train.scheduledTime}</span>
                                  <ArrowRight size={11} className="text-amber-600" />
                                  <span className="font-bold text-amber-900">Delayed: {train.delayedTime}</span>
                                </div>
                                {train.action && (
                                  <p className="mt-1 text-[11px] text-slate-600">
                                    <strong className="text-amber-900">Regulation:</strong> {train.action}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-1.5 px-2 pb-0.5 text-xs font-medium text-emerald-800">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                        <span>Zero train delays · all movements on schedule</span>
                      </div>
                    )}
                    {isDiversionType && option.routeGeometry?.coordinates?.length > 1 && trackIds[0] && (
                      <Link
                        to={`/officer/live-map?preview=diversion&track=${encodeURIComponent(trackIds[0])}&request=${encodeURIComponent(request.id)}&extraKm=${encodeURIComponent(String(option.trainImpact || option.description).match(/\+?(\d+(?:\.\d+)?)\s*km/i)?.[1] || 14)}&delay=${encodeURIComponent(option.delayMinutes || 20)}`}
                        state={{ trackId: trackIds[0], requestId: request.id, detourAlternative: option }}
                        className={`mt-1.5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-violet-50 px-3 text-sm font-semibold text-violet-800 hover:bg-violet-100 ${focusRing}`}
                      >
                        <MapPin size={16} aria-hidden="true" /> Preview diversion on map
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          ) : <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">No verified operational options are available.</p>}

          {/* When diversion is blocked due to electric traction or skipped mandatory halts, alert officer clearly */}
          {isDiversionBlocked && (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-950">
              <div className="flex items-start gap-2.5">
                <div className="rounded-full bg-rose-100 p-1.5 text-rose-700 shrink-0 mt-0.5">
                  <Ban size={18} />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-sm text-amber-950 flex items-center gap-2 flex-wrap">
                      <span>Diversion Option Unavailable</span>
                      {isMandatoryHaltBlocked && (
                        <span className="rounded bg-rose-100 border border-rose-300 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                          {mandatoryHaltsEval.missedStops?.some(m => isFreightTrain(m) || m.isFreight || String(m.trainNo).startsWith("G-"))
                            ? "SKIPS MANDATORY FREIGHT CREW RELIEF / SIDING"
                            : "SKIPS MANDATORY COMMERCIAL HALTS"}
                        </span>
                      )}
                      {isElectricDiversionBlocked && (
                        <span className="rounded bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          {diversionPassivity.electricTrains?.some(t => isFreightTrain(t))
                            ? "ELECTRIC FREIGHT (WAG / 25kV AC) CANNOT BE DIVERTED"
                            : "ELECTRIC TRAINS CANNOT BE DIVERTED"}
                        </span>
                      )}
                    </span>
                  </div>

                  {isMandatoryHaltBlocked && (
                    <div className="space-y-1.5 rounded-lg border border-rose-200 bg-white/70 p-2.5">
                      <p className="text-amber-950 font-semibold text-[11px] leading-snug">
                        Mandatory Technical Points / Commercial Halts Bypassed by Alternate Corridor:
                      </p>
                      <p className="text-slate-700 text-[11px] leading-relaxed">
                        The proposed diversion bypass route bypasses designated stations. Under Indian Railways operating regulations (FOIS for freight, coaching operating manual for passenger), trains cannot bypass mandatory crew change points, industrial terminal sidings, or scheduled commercial passenger stops.
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {mandatoryHaltsEval.missedStops?.map((s, idx) => (
                          <span key={s.stationCode || idx} className="inline-flex items-center gap-1.5 rounded bg-white px-2.5 py-1 text-[11px] font-medium text-slate-800 border border-rose-300 shadow-2xs">
                            <MapPin size={13} className="text-rose-600 shrink-0" />
                            <strong>{s.stationName} ({s.stationCode})</strong>
                            <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-900">
                              Train {s.trainNo} · {s.reason || "Mandatory Halt / Siding"}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {isElectricDiversionBlocked && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-amber-900 leading-relaxed text-[11px]">
                        The conflicting trains in this window operate under <strong>25kV AC electric traction</strong> (including WAG heavy-haul freight / WAP passenger locomotives). Diversion option is not offered because electric locomotives require continuous Overhead Equipment (OHE) catenary wires, which are absent on alternate bypass corridors.
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {diversionPassivity.electricTrains?.map((t, idx) => (
                          <span key={t.trainNo || idx} className="inline-flex items-center gap-1.5 rounded bg-white px-2.5 py-1 text-[11px] font-medium text-slate-800 border border-amber-200 shadow-2xs">
                            {isFreightTrain(t) ? <Package size={13} className="text-amber-700" /> : <TrainFront size={13} className="text-[#315b75]" />}
                            <strong>{t.trainNo}</strong> {t.trainName}
                            <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-900">
                              {t.locoClass || t.type} · 25kV AC Electric
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {diversionRaw?.routeGeometry?.coordinates?.length > 1 && trackIds[0] && (
                    <div className="pt-1.5 flex items-center justify-between flex-wrap gap-2 border-t border-amber-200/80 mt-2">
                      <span className="text-[11px] text-amber-800 italic">
                        Alternate bypass route (+{diversionRaw.routeGeometry.extraDistanceKm || 8.9} km) exists on network topology, but cannot accommodate the commercial service constraints.
                      </span>
                      <Link
                        to={`/officer/live-map?preview=diversion&track=${encodeURIComponent(trackIds[0])}&request=${encodeURIComponent(request.id)}&extraKm=${encodeURIComponent(diversionRaw.routeGeometry.extraDistanceKm || 8.9)}&delay=${encodeURIComponent(diversionRaw.delayMinutes || 12)}`}
                        state={{ trackId: trackIds[0], requestId: request.id, detourAlternative: diversionRaw }}
                        className={`inline-flex items-center gap-1 text-xs font-semibold text-purple-900 hover:text-purple-950 underline underline-offset-2 ${focusRing}`}
                      >
                        <MapPin size={13} /> View bypass path on map
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[#dce4e7] bg-white p-4" aria-labelledby={`factors-${request.id}`}><h4 id={`factors-${request.id}`} className="font-semibold text-[#172630]">Priority factors</h4><dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">{[["Safety", breakdown.safety], ["Urgency", breakdown.urgency], ["Failure probability", breakdown.failureProbability], ["Asset condition", breakdown.criticality], ["Train impact", breakdown.trainImpact], ["Asset availability", breakdown.assetAvailability]].map(([label, value]) => <div key={label}><dt className="text-[#667680]">{label}</dt><dd className="mt-0.5 font-semibold text-[#263a47]">{value ?? "—"}{value != null ? "%" : ""}</dd></div>)}</dl></section>
          <section className="rounded-xl border border-[#dce4e7] bg-white p-4" aria-labelledby={`traffic-${request.id}`}>
            <h4 id={`traffic-${request.id}`} className="font-semibold text-[#172630]">Timetable evidence</h4>
            {conflictingTrains.length ? (
              <ul className="mt-3 space-y-2">
                {conflictingTrains.map((train, index) => (
                  <li key={train.trainNo || index} className="flex items-start gap-2 text-sm text-[#536570]">
                    <TrainFront size={16} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
                    <span>
                      <strong className="font-semibold text-[#263a47]">{train.trainName || `Train ${train.trainNo}`}</strong>
                      <br />
                      {windowText(train.arrival || train.arrivalTime, train.departure || train.departureTime)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-sm leading-5 text-[#5f707b] space-y-2">
                <p>No conflicting train movement inside requested window ({requestedStart}–{requestedEnd}).</p>
                {(() => {
                  const trailingCorr = getDelayedTrainsForOption(alternatives.find((a) => a.type === "DELAY") || { type: "DELAY", delayMinutes: 10 }, request);
                  if (!trailingCorr || trailingCorr.length === 0) return null;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
                      <p className="font-semibold text-slate-800 mb-1">Trailing corridor movements following window:</p>
                      <ul className="space-y-1">
                        {trailingCorr.map((t, idx) => (
                          <li key={t.trainNo || idx} className="flex items-center justify-between">
                            <span className="font-medium text-slate-800">{t.trainNo} {t.trainName} ({t.type})</span>
                            <span className="font-mono text-slate-600">{t.scheduledTime}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1.5 text-[11px] text-slate-500">Regulated only if the DELAY buffer is activated by maintenance overrun.</p>
                    </div>
                  );
                })()}
              </div>
            )}
          </section>
        </div>
        <section><button type="button" onClick={() => setShowTrace((open) => !open)} aria-expanded={showTrace} className={`flex min-h-11 w-full items-center justify-between rounded-lg border border-[#dce4e7] bg-white px-4 text-left text-sm font-semibold text-[#29485e] hover:bg-[#f4f8fa] ${focusRing}`}><span>Agent handoff record</span>{showTrace ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}</button>{showTrace && <div className="mt-2"><AgentDecisionTrace compact requestId={request.id} trackIds={trackIds} requestedWindow={{ startTime: requestedStart, endTime: requestedEnd }} agentPlan={tracePlan} status={request.status} /></div>}</section>
      </div>}

      {showReviewModal && <Modal title={decisionType === "APPROVED" ? "Approve a plan" : decisionType === "REVISION_REQUIRED" ? "Request a modified plan" : "Decline request"} onClose={() => setShowReviewModal(false)} maxWidth="max-w-xl">
        <form onSubmit={submitReview} className="max-h-[75vh] overflow-y-auto pr-1 text-base"><p className="mb-5 text-sm leading-5 text-[#61727d]">Case <span className="font-mono font-semibold text-[#263a47]">{request.id}</span>. Review the information below before confirming.</p>
          {decisionType === "APPROVED" && (
            <fieldset>
              <legend className="font-semibold text-[#172630]">Operational option</legend>
              <p className="mt-1 text-sm text-[#657680]">Choose one option. This selection becomes part of the decision record.</p>
              <div className="mt-3 space-y-2">
                {alternatives.map((option, index) => {
                  const id = option.id || option.type;
                  const selected = selectedAltId === id;
                  const optDel = getDelayedTrainsForOption(option, request);

                  return (
                    <label
                      key={id || index}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        selected ? "border-[#315b75] bg-[#eef5f8]" : "border-[#dce4e7] hover:bg-[#f8fafb]"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`alternative-${request.id}`}
                        value={id}
                        checked={selected}
                        onChange={() => selectAlternative(option)}
                        className="mt-1 size-4 accent-[#315b75]"
                      />
                      <span className="flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="block text-sm font-semibold text-[#203746]">
                            {formatOptionType(option.type, option.rank || index + 1)}
                          </span>
                          {optDel.length > 0 ? (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              +{option.delayMinutes || 10}m ({optDel.length} trains)
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                              0 min delay
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-sm leading-5 text-[#5f707b]">
                          {option.description?.replace(/reroute/gi, "diversion")}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Informational banner when diversion is excluded due to electric trains or missed mandatory halts */}
              {isDiversionBlocked && (
                <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 flex items-start gap-2.5">
                  <Ban size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 flex-1">
                    <span className="font-bold text-amber-950 block">
                      Diversion option excluded ({[isMandatoryHaltBlocked && "Mandatory Halts Skipped", isElectricDiversionBlocked && "Electric Trains Involved"].filter(Boolean).join(" & ")})
                    </span>
                    {isMandatoryHaltBlocked && (
                      <p className="text-[11px] text-amber-900 leading-relaxed">
                        • <strong>Mandatory Commercial Halts Skipped:</strong> Alternate bypass route bypasses scheduled commercial passenger stops at {mandatoryHaltsEval.missedStops?.map((m) => `${m.stationName} (${m.stationCode})`).join(", ") || "intermediate stations"}. Under Indian Railways operating regulations, passenger commercial stops cannot be bypassed during maintenance block diversions.
                      </p>
                    )}
                    {isElectricDiversionBlocked && (
                      <p className="text-[11px] text-amber-900 leading-relaxed">
                        • <strong>Electric Traction Constraint:</strong> Conflicting train movements operate on <strong>25kV AC electric traction</strong> and cannot be diverted because alternate bypass corridors lack continuous overhead electrification (OHE).
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Delayed Trains Showcase in Modal */}
              {(() => {
                const modalDelayed = getDelayedTrainsForOption(selectedAlternative, request);
                if (modalDelayed.length > 0) {
                  return (
                    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/80 p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={17} className="text-amber-700 shrink-0" />
                          <h4 className="font-semibold text-sm text-amber-950">
                            Trains Getting Delayed ({modalDelayed.length} movement{modalDelayed.length > 1 ? "s" : ""} affected)
                          </h4>
                        </div>
                        <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                          +{Math.max(...modalDelayed.map((t) => t.delayMinutes || 0))} min
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-amber-800">
                        The following trains will be regulated or held to allow this possession option:
                      </p>
                      <div className="mt-2.5 space-y-2">
                        {modalDelayed.map((train, idx) => (
                          <div key={train.trainNo || idx} className="rounded-lg border border-amber-200 bg-white p-2.5 text-xs shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 font-medium text-[#172630]">
                                <TrainFront size={14} className="text-[#315b75]" />
                                <span className="font-bold text-slate-900">{train.trainNo}</span>
                                <span className="text-slate-700">{train.trainName}</span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">{train.type}</span>
                              </div>
                              <span className="font-semibold text-rose-700">+{train.delayMinutes} min delay</span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px] text-slate-600">
                              <span className="text-slate-500">Scheduled: {train.scheduledTime}</span>
                              <ArrowRight size={12} className="text-amber-600" />
                              <span className="font-bold text-amber-900">Delayed: {train.delayedTime}</span>
                            </div>
                            {train.action && (
                              <div className="mt-1.5 text-[11px] text-slate-600 bg-amber-50/60 rounded p-1.5 border border-amber-100">
                                <strong className="text-amber-950">Operational Regulation:</strong> {train.action}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900">
                    <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                    <span>Zero train delays. Timetable remains 100% on schedule under this option.</span>
                  </div>
                );
              })()}
            </fieldset>
          )}
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
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setShowReviewModal(false)} className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-[#526570] hover:bg-[#f0f4f5] ${focusRing}`}>Cancel</button>
            <button type="submit" disabled={decisionType === "APPROVED" && (!selectedAltId || !isVerifiedPlan)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white ${focusRing} ${decisionType === "REVISION_REQUIRED" ? "bg-amber-700 hover:bg-amber-800" : decisionType === "REJECTED" ? "bg-red-700 hover:bg-red-800" : selectedAltId && isVerifiedPlan ? "bg-[#315b75] hover:bg-[#25485e]" : "cursor-not-allowed bg-slate-300"}`}>
              {decisionType === "APPROVED" ? <CheckCircle2 size={17} aria-hidden="true" /> : decisionType === "REVISION_REQUIRED" ? <Route size={17} aria-hidden="true" /> : <Ban size={17} aria-hidden="true" />}
              {decisionType === "APPROVED" ? `Approve ${formatOptionType(selectedAlternative?.type, selectedAlternative?.rank || 1) || "selected option"}` : decisionType === "REVISION_REQUIRED" ? "Generate revised plan" : "Confirm decline"}
            </button>
          </div>
        </form>
      </Modal>}

      {showProofModal && completionProof && (
        <Modal
          title={`Field Work Completion Evidence — ${request.id}`}
          onClose={() => setShowProofModal(false)}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            {completionProof.photo ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-black flex items-center justify-center max-h-[460px]">
                <img
                  src={completionProof.photo}
                  alt="Field work photographic evidence"
                  className="w-full max-h-[460px] object-contain"
                />
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                No photo preview available for this submission.
              </div>
            )}

            <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-teal-950 font-semibold">
                <span>Submitted by {completionProof.completed_by || "Engineering Crew"}</span>
                <span className="font-mono text-[11px] text-teal-800">
                  {completionProof.completed_at ? new Date(completionProof.completed_at).toLocaleString("en-IN") : ""}
                </span>
              </div>
              <p className="text-slate-800 bg-white p-2.5 rounded-lg border border-teal-100 italic leading-relaxed text-xs">
                "{completionProof.notes || "Block completed and track handed back safe for traffic."}"
              </p>
            </div>

            {!canCertify && !isVerifiedWork && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <span>
                  You are currently signed in as <strong>{user?.name || user?.username || "Field Crew"}</strong> (Role: <span className="font-semibold uppercase">{user?.role || "TEAMS"}</span>). Track clearance certification requires an authorized <strong>Officer</strong> or <strong>Admin</strong> account.
                </span>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowProofModal(false)}
                className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 ${focusRing}`}
              >
                Close
              </button>
              {!isVerifiedWork ? (
                <button
                  type="button"
                  disabled={verifying || !canCertify}
                  onClick={handleVerifyWork}
                  title={!canCertify ? "Requires Officer or Admin session to certify track clearance" : undefined}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-white ${
                    canCertify ? "bg-emerald-700 hover:bg-emerald-800" : "bg-slate-400 cursor-not-allowed opacity-75"
                  } ${focusRing}`}
                >
                  <ShieldCheck size={17} /> {verifying ? "Certifying..." : "Verify & Certify Track Clear"}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 size={16} /> Certified Safe for Traffic
                </span>
              )}
            </div>
          </div>
        </Modal>
      )}
    </article>
  );
}
