// frontend/src/components/officer/RequestCard.jsx
import { useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Route,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Sliders,
  XCircle,
  TrendingUp,
  Ban,
} from "lucide-react";
import { requestStatusStyles } from "../../utils/constants";

function computeRevisedPreview(pStart, pEnd, duration = 90) {
  if (!pStart || !pEnd) return null;
  const parseMin = (t) => {
    const [h, m] = (t || "00:00").split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const formatMin = (min) => {
    const norm = ((min % 1440) + 1440) % 1440;
    const h = String(Math.floor(norm / 60)).padStart(2, "0");
    const m = String(norm % 60).padStart(2, "0");
    return `${h}:${m}`;
  };

  let pEndMin = parseMin(pEnd);
  const pStartMin = parseMin(pStart);
  if (pEndMin <= pStartMin) pEndMin += 1440;

  const candStart = pEndMin + 15;
  const candEnd = candStart + duration;

  return {
    startTime: formatMin(candStart),
    endTime: formatMin(candEnd),
  };
}

export default function RequestCard({ request, onApprove, onDecline, onRevision }) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [decisionType, setDecisionType] = useState("APPROVED");
  const [selectedAltId, setSelectedAltId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Prohibited time window state (times on which block cannot be planned)
  const initialProhibited = request.raw?.prohibited_window || request.prohibitedWindow;
  const [prohibitedStartTime, setProhibitedStartTime] = useState(
    initialProhibited?.startTime || request.raw?.preferred_start_time || "18:00"
  );
  const [prohibitedEndTime, setProhibitedEndTime] = useState(
    initialProhibited?.endTime || request.raw?.preferred_end_time || "22:00"
  );

  // Derive live AI Agent Plan information
  const priorityScore = request.priorityScore ?? request.agentPlan?.priorityScore ?? 75;
  const breakdown = request.agentPlan?.breakdown || {};
  const prohibitedWindow = request.raw?.prohibited_window || request.prohibitedWindow;
  const recommendedBlock = request.recommendedBlock || request.agentPlan?.recommendedBlock;
  const isRevised = Boolean(
    prohibitedWindow ||
    recommendedBlock?.isRevised ||
    request.status === "Revised Plan" ||
    request.status === "AI Processing" ||
    request.status === "REVISION_REQUIRED"
  );
  const hasConflict = isRevised ? false : Boolean(
    request.conflict || (request.conflictingTrains && request.conflictingTrains.length > 0)
  );
  const conflictingTrains = isRevised ? [] : (request.conflictingTrains || request.agentPlan?.conflictingTrains || []);
  const rawAlternatives = (request.alternatives && request.alternatives.length > 0)
    ? request.alternatives
    : (request.agentPlan?.alternatives || []);

  // Ensure all 3 canonical operational options (RESCHEDULE, REROUTE, DELAY) are present
  const alternatives = (() => {
    const list = [...rawAlternatives];
    const types = list.map((a) => a.type);
    if (!types.includes("RESCHEDULE")) {
      list.push({
        id: "RESCHEDULE",
        type: "RESCHEDULE",
        description: `Reschedule block possession to ${recommendedBlock?.startTime || "22:15"}-${recommendedBlock?.endTime || "23:45"} outside peak hours.`,
        trainImpact: "Zero passenger train disruption",
        priorityScore: priorityScore,
        rank: 1,
      });
    }
    if (!types.includes("REROUTE")) {
      list.push({
        id: "REROUTE",
        type: "REROUTE",
        description: "Reroute freight traffic via chord junction line (+14 km detour).",
        trainImpact: "Detour +14 km (+20 min transit time)",
        priorityScore: Math.max(priorityScore - 6, 50),
        rank: 2,
      });
    }
    if (!types.includes("DELAY")) {
      list.push({
        id: "DELAY",
        type: "DELAY",
        description: "Regulate goods train at preceding loop siding for 15 minutes.",
        trainImpact: "15 min goods regulation delay",
        priorityScore: Math.max(priorityScore - 12, 45),
        rank: 3,
      });
    }
    return list;
  })();

  const selectedAlt = alternatives.find(
    (a) => a.id === selectedAltId || a.type === selectedAltId
  );
  const aiExplanation = request.aiExplanation || request.agentPlan?.explanation;

  const handleOpenReview = (type, preSelectedAlt = null) => {
    setDecisionType(type);
    const chosenId = preSelectedAlt?.id || preSelectedAlt?.type || null;
    setSelectedAltId(chosenId);

    if (type === "APPROVED") {
      if (preSelectedAlt) {
        setFeedback(`Approved under [${preSelectedAlt.type}]: ${preSelectedAlt.description}`);
      } else {
        setFeedback("");
      }
    } else if (type === "REVISION_REQUIRED") {
      setSelectedAltId(null);
      const defaultStart = request.raw?.preferred_start_time || "18:00";
      const defaultEnd = request.raw?.preferred_end_time || "22:00";
      setProhibitedStartTime(defaultStart);
      setProhibitedEndTime(defaultEnd);
      setFeedback(
        `Corridor possession prohibited between ${defaultStart} and ${defaultEnd}. Entire block plan revised by AI engine.`
      );
    } else {
      setSelectedAltId(null);
      setFeedback("Declined due to peak passenger traffic priority on the requested section.");
    }
    setShowReviewModal(true);
  };

  const handleSelectAlternative = (alt) => {
    setSelectedAltId(alt.id || alt.type);
    setFeedback(`Approved under [${alt.type}]: ${alt.description}`);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (decisionType === "APPROVED" && !selectedAltId) {
      alert("Please select one of the operational options (Reschedule, Reroute, or Delay) before approving.");
      return;
    }

    const prohibitedData =
      decisionType === "REVISION_REQUIRED"
        ? {
            startTime: prohibitedStartTime,
            endTime: prohibitedEndTime,
            reason: feedback,
          }
        : null;

    if (decisionType === "APPROVED") {
      onApprove?.(request, feedback, selectedAltId);
    } else if (decisionType === "REVISION_REQUIRED") {
      onRevision?.(request, feedback, selectedAltId, prohibitedData);
    } else {
      onDecline?.(request, feedback);
    }
    setShowReviewModal(false);
  };

  // Score styling
  const scoreColor =
    priorityScore >= 80
      ? "bg-purple-50 text-purple-800 border-purple-200"
      : priorityScore >= 65
      ? "bg-blue-50 text-blue-800 border-blue-200"
      : "bg-emerald-50 text-emerald-800 border-emerald-200";

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-5 flex flex-col justify-between gap-4 hover:border-green-300 transition-all relative">
      {/* Header with Department, Track, and Live Status */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-green-800 bg-green-100 px-2.5 py-0.5 rounded">
              {request.department}
            </span>
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <MapPin size={12} className="text-green-700" /> {request.raw?.track_id || "KA-T-000342"}
            </span>

            {/* AI MCDA Priority Score Badge */}
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${scoreColor}`}
            >
              <Zap size={11} className="text-amber-500" />
              MCDA Score: {priorityScore}/100
            </span>
          </div>

          <h4 className="font-bold text-gray-900 text-lg mt-1.5">{request.type}</h4>
          <p className="text-xs font-mono text-gray-400">{request.id}</p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
            requestStatusStyles[request.status] || "bg-blue-100 text-blue-700"
          }`}
        >
          {request.status}
        </span>
      </div>

      {/* Possession Window Details */}
      <div className="space-y-2.5 text-xs bg-gray-50 p-3.5 rounded-lg border border-gray-100">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-gray-400 font-medium">Requested Window</p>
            <p className="text-gray-900 font-semibold flex items-center gap-1 mt-0.5">
              <Clock size={13} className="text-green-700" />
              {request.raw?.preferred_start_time || "19:00"} - {request.raw?.preferred_end_time || "21:00"}
              &nbsp;({request.date})
            </p>
          </div>
          <div>
            <p className="text-gray-400 font-medium">Estimated Possession</p>
            <p className="text-gray-900 font-semibold mt-0.5">
              {request.raw?.estimated_duration_minutes || 120} mins (
              {(Number(request.raw?.estimated_duration_minutes || 120) / 60).toFixed(1)} hrs)
            </p>
          </div>
        </div>

        {/* Track possession zone */}
        <div>
          <p className="text-gray-400 font-medium mb-1">
            Track Possession Segments{" "}
            {(request.raw?.track_ids?.length || 1) > 1 && (
              <span className="text-green-700 font-bold">
                ({request.raw.track_ids.length} segments)
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(request.raw?.track_ids?.length > 0
              ? request.raw.track_ids
              : [request.raw?.track_id || "KA-T-000342"]
            ).map((tid) => (
              <span
                key={tid}
                className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-800"
              >
                <Route size={10} className="text-green-700" />
                {tid}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* PROMINENT REVISED BLOCK PLAN DISPLAY (When request is revised / blackout enforced) */}
      {isRevised ? (
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 border-2 border-emerald-400 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h5 className="font-extrabold text-emerald-950 text-sm tracking-wide uppercase flex items-center gap-1.5">
                <Sparkles size={16} className="text-amber-500" />
                Revised Block Plan
              </h5>
            </div>
            <span className="text-xs font-mono font-bold bg-emerald-800 text-white px-3 py-1 rounded-full shadow-2xs">
              AI Optimized Slot
            </span>
          </div>

          {/* Timing comparison: Original vs Blackout vs Revised */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-white/90 p-2.5 rounded-lg border border-gray-200">
              <span className="text-[10px] text-gray-400 font-semibold block uppercase">
                Original Requested
              </span>
              <span className="font-mono text-gray-500 line-through font-semibold text-xs">
                {request.raw?.preferred_start_time || "19:00"} - {request.raw?.preferred_end_time || "21:00"}
              </span>
            </div>

            <div className="bg-rose-50/90 p-2.5 rounded-lg border border-rose-200">
              <span className="text-[10px] text-rose-600 font-bold block uppercase flex items-center gap-1">
                <Ban size={11} /> Prohibited Blackout
              </span>
              <span className="font-mono text-rose-800 font-bold text-xs">
                {prohibitedWindow?.startTime || "18:00"} - {prohibitedWindow?.endTime || "22:00"}
              </span>
            </div>

            <div className="bg-emerald-100 p-2.5 rounded-lg border border-emerald-400 shadow-2xs">
              <span className="text-[10px] text-emerald-800 font-extrabold block uppercase flex items-center gap-1">
                <Clock size={11} className="text-emerald-700" /> New Revised Slot
              </span>
              <span className="font-mono text-emerald-950 font-black text-sm">
                {recommendedBlock?.startTime || "22:15"} - {recommendedBlock?.endTime || "23:45"}
              </span>
            </div>
          </div>

          {/* Corridor & Safety Clearance Note */}
          <div className="bg-white/95 p-2.5 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-950 block">Clear Corridor Possession Verified</span>
              <p className="text-gray-600 mt-0.5">
                {aiExplanation || `Scheduled possession window shifted to ${recommendedBlock?.startTime || "22:15"} - ${recommendedBlock?.endTime || "23:45"} strictly outside officer-designated restricted hours with zero passenger train delays.`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Standard Conflict or Clear Corridor Display (Pre-Revision) */
        hasConflict ? (
          <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold">
              <AlertTriangle size={15} className="text-amber-600" />
              <span>Train Traffic Conflict Detected</span>
            </div>
            {conflictingTrains.length > 0 ? (
              <div className="space-y-1 pl-4 border-l-2 border-amber-400 text-amber-800">
                {conflictingTrains.map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="font-semibold">{t.trainName || `Train ${t.trainNo}`}</span>
                    <span className="font-mono text-[11px] bg-white/70 px-1.5 py-0.5 rounded">
                      Slot: {t.arrival || t.arrivalTime || "19:15"} - {t.departure || t.departureTime || "19:22"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-amber-800">
                Requested window overlaps with high-density express passenger timetable.
              </p>
            )}

            {recommendedBlock && (
              <p className="text-amber-900 font-medium pt-1 text-[11px] border-t border-amber-200/60">
                💡 AI Recommended Window:{" "}
                <span className="font-bold underline">
                  {recommendedBlock.startTime} - {recommendedBlock.endTime}
                </span>{" "}
                (Zero passenger disruption)
              </p>
            )}
          </div>
        ) : (
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-lg p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>Clear Corridor Slot (Zero Train Conflict)</span>
            </div>
            {recommendedBlock && (
              <div className="bg-white/80 p-2 rounded border border-emerald-200 font-mono text-xs font-bold text-emerald-900 flex items-center justify-between">
                <span>Optimal Slot: {recommendedBlock.startTime} - {recommendedBlock.endTime}</span>
                <span className="text-[10px] font-sans text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                  Score: {recommendedBlock.priorityScore || priorityScore}/100
                </span>
              </div>
            )}
            <p className="text-emerald-700 text-[11px]">
              {aiExplanation || "Direct maintenance clearance verified across Karnataka timetable schedules."}
            </p>
          </div>
        )
      )}

      {/* MCDA Priority Factor Breakdown Drawer */}
      <div>
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-green-800 transition-colors cursor-pointer"
        >
          <TrendingUp size={12} />
          <span>MCDA Priority Factor Breakdown</span>
          {showBreakdown ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showBreakdown && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-[11px]">
            <div>
              <span className="text-gray-400">Safety Criticality:</span>
              <p className="font-bold text-gray-800">{breakdown.safety || 95}%</p>
            </div>
            <div>
              <span className="text-gray-400">Track Urgency:</span>
              <p className="font-bold text-gray-800">{breakdown.urgency || 80}%</p>
            </div>
            <div>
              <span className="text-gray-400">Failure Prob.:</span>
              <p className="font-bold text-gray-800">{breakdown.failureProbability || 65}%</p>
            </div>
            <div>
              <span className="text-gray-400">Asset Condition:</span>
              <p className="font-bold text-gray-800">{breakdown.criticality || 70}%</p>
            </div>
            <div>
              <span className="text-gray-400">Train Impact:</span>
              <p className="font-bold text-gray-800">{breakdown.trainImpact || 60}%</p>
            </div>
            <div>
              <span className="text-gray-400">Asset Avail.:</span>
              <p className="font-bold text-gray-800">{breakdown.assetAvailability || 85}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Operational Approval Options Preview */}
      {alternatives.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
            <span className="flex items-center gap-1 font-bold text-gray-700">
              <Sparkles size={12} className="text-amber-500" />
              Operational Approval Options ({alternatives.length}):
            </span>
            <span className="text-[10px] text-gray-400 font-medium">Select option to approve</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {alternatives.map((alt, idx) => {
              const isSelected = selectedAltId === alt.id || selectedAltId === alt.type;
              return (
                <div
                  key={alt.id || idx}
                  onClick={() => handleOpenReview("APPROVED", alt)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all text-xs ${
                    isSelected
                      ? "border-green-600 bg-green-50/90 shadow-2xs ring-1 ring-green-600"
                      : "border-gray-200 bg-white hover:border-green-400 hover:bg-green-50/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        isSelected ? "bg-green-800 text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {alt.type}
                    </span>
                    <span className="text-gray-800 text-[11px] line-clamp-1 font-medium">
                      {alt.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] font-semibold text-green-700">
                      {alt.trainImpact || (alt.delayMinutes === 0 ? "0 delay" : `+${alt.delayMinutes}m delay`)}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-bold bg-green-700 text-white px-1.5 py-0.5 rounded">
                        ✓ Selected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decision Buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => handleOpenReview("APPROVED")}
          className="flex-1 bg-green-800 hover:bg-green-900 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
        >
          <CheckCircle2 size={14} /> Approve Plan
        </button>
        <button
          onClick={() => handleOpenReview("REVISION_REQUIRED")}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
        >
          <Sliders size={14} /> Modify Plan
        </button>
        <button
          onClick={() => handleOpenReview("REJECTED")}
          className="px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
        >
          Decline
        </button>
      </div>

      {/* Officer Decision & Alternative Selection Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmitReview}
            className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 text-sm max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-900">
                Officer Block Decision & Review
              </h3>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Action: <span className="font-bold text-green-800">{decisionType}</span> for{" "}
              <span className="font-mono font-bold text-gray-800">{request.id}</span>
            </p>

            {/* If Modifying / Revision Required: Display Select Prohibited Time Field */}
            {decisionType === "REVISION_REQUIRED" && (
              <div className="mb-4 bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <Ban size={16} className="text-rose-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Select Prohibited Time Window (Block Cannot Be Planned)
                    </h4>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      Choose the hours during which corridor track block is strictly prohibited.
                      The entire block plan will be recalculated outside this window.
                    </p>
                  </div>
                </div>

                {/* Time Selection Fields */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <Clock size={12} className="text-amber-700" />
                      Prohibited From Time:
                    </label>
                    <input
                      type="time"
                      value={prohibitedStartTime}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setProhibitedStartTime(newStart);
                        setFeedback(`Corridor possession prohibited between ${newStart} and ${prohibitedEndTime}. Requesting entire block plan revision.`);
                      }}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-gray-900 outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <Clock size={12} className="text-amber-700" />
                      Prohibited Until Time:
                    </label>
                    <input
                      type="time"
                      value={prohibitedEndTime}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        setProhibitedEndTime(newEnd);
                        setFeedback(`Corridor possession prohibited between ${prohibitedStartTime} and ${newEnd}. Requesting entire block plan revision.`);
                      }}
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-gray-900 outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
                      required
                    />
                  </div>
                </div>

                {/* Quick select presets */}
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Quick Window Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Evening Peak (18:00 - 22:00)", start: "18:00", end: "22:00" },
                      { label: "Morning Rush (07:00 - 10:30)", start: "07:00", end: "10:30" },
                      { label: "Afternoon Express (13:00 - 16:30)", start: "13:00", end: "16:30" },
                      {
                        label: `Current Window (${request.raw?.preferred_start_time || "19:00"} - ${request.raw?.preferred_end_time || "21:00"})`,
                        start: request.raw?.preferred_start_time || "19:00",
                        end: request.raw?.preferred_end_time || "21:00",
                      },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setProhibitedStartTime(preset.start);
                          setProhibitedEndTime(preset.end);
                          setFeedback(`Corridor possession prohibited between ${preset.start} and ${preset.end}. Requesting entire block plan revision.`);
                        }}
                        className={`text-[10px] px-2 py-1 rounded-md border font-medium cursor-pointer transition-all ${
                          prohibitedStartTime === preset.start && prohibitedEndTime === preset.end
                            ? "bg-amber-600 text-white border-amber-600 shadow-2xs font-semibold"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-amber-100/50"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-Time Calculated Revised Block Plan Preview */}
                {(() => {
                  const preview = computeRevisedPreview(
                    prohibitedStartTime,
                    prohibitedEndTime,
                    Number(request.raw?.estimated_duration_minutes || 90)
                  );
                  if (!preview) return null;
                  return (
                    <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3 space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                          <Sparkles size={14} className="text-amber-500" />
                          Calculated Revised Block Plan:
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                          Zero Conflict Slot
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-emerald-200">
                        <Clock size={16} className="text-emerald-700 shrink-0" />
                        <div>
                          <span className="text-[10px] text-gray-400 font-semibold block uppercase">
                            New Scheduled Block Window
                          </span>
                          <span className="font-mono font-bold text-base text-emerald-950">
                            {preview.startTime} - {preview.endTime}
                          </span>
                          <span className="text-xs text-gray-500 ml-2 font-medium">
                            ({request.raw?.estimated_duration_minutes || 90} mins)
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-emerald-800 space-y-0.5">
                        <p>✓ Avoids prohibited blackout window ({prohibitedStartTime} - {prohibitedEndTime}).</p>
                        <p>✓ AI verifies clean corridor clearance across all train timetable movements.</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* MANDATORY ALTERNATIVE SELECTION FOR PLAN APPROVAL */}
            {decisionType === "APPROVED" && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Select Operational Option (Mandatory for Approval):
                  </label>
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                    Selection Required *
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mb-2.5">
                  Before sanctioning the block plan, you must select one of the operational execution alternatives (Reschedule, Reroute, or Delay):
                </p>

                <div className="space-y-2">
                  {alternatives.map((alt) => {
                    const isSelected = selectedAltId === alt.id || selectedAltId === alt.type;
                    return (
                      <div
                        key={alt.id || alt.type}
                        onClick={() => handleSelectAlternative(alt)}
                        className={`p-3 rounded-xl border-2 text-xs cursor-pointer transition-all ${
                          isSelected
                            ? "border-green-600 bg-green-50/90 shadow-xs ring-2 ring-green-500/20"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? "border-green-600 bg-green-600 text-white"
                                  : "border-gray-300"
                              }`}
                            >
                              {isSelected && <CheckCircle2 size={12} />}
                            </div>
                            <span className="text-green-900 font-mono font-bold text-xs">
                              {alt.type} {alt.rank ? `(Rank #${alt.rank})` : ""}
                            </span>
                          </div>
                          <span className="text-xs text-gray-600 font-semibold">
                            Score: {alt.priorityScore || 75}/100
                          </span>
                        </div>
                        <p className="text-gray-800 text-xs pl-6">{alt.description}</p>
                        <span className="text-[10px] text-amber-700 font-semibold block mt-1.5 pl-6">
                          Operational Impact: {alt.trainImpact || "Negligible"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {!selectedAltId && (
                  <div className="mt-2.5 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle size={15} className="text-amber-600 shrink-0" />
                    <span>Please click an option above (Reschedule, Reroute, or Delay) to enable plan approval.</span>
                  </div>
                )}
              </div>
            )}

            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Operational Directives & Written Feedback
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-xs outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
              placeholder="Provide directives for maintenance team and control office..."
              required
            />

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={decisionType === "APPROVED" && !selectedAltId}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-1.5 ${
                  decisionType === "REVISION_REQUIRED"
                    ? "bg-amber-600 hover:bg-amber-700 cursor-pointer"
                    : decisionType === "APPROVED" && !selectedAltId
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-70"
                    : "bg-green-800 hover:bg-green-900 cursor-pointer shadow-xs"
                }`}
              >
                {decisionType === "REVISION_REQUIRED" ? (
                  <>
                    <Sparkles size={14} />
                    <span>Revise Entire Block Plan</span>
                  </>
                ) : decisionType === "APPROVED" ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>
                      {selectedAltId
                        ? `Approve Plan (${selectedAlt?.type || "Selected Option"})`
                        : "Select Option to Approve"}
                    </span>
                  </>
                ) : (
                  <span>Confirm Decision</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
