import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, Camera, CheckCircle2, ClipboardCheck, FileCheck, RefreshCw, RotateCcw } from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import RequestCard from "../../components/officer/RequestCard";
import { fetchRequests, updateRequestStatus, compareRequestsLatestFirst } from "../../utils/api";

const FILTERS = [
  { value: "ALL", label: "All", icon: ClipboardCheck },
  { value: "READY", label: "Ready", icon: CheckCircle2 },
  { value: "CONFLICT", label: "Conflicts", icon: AlertTriangle },
  { value: "REVISION", label: "Revised", icon: RotateCcw },
  { value: "COMPLETED", label: "Completed Work", icon: Camera },
];

export default function OfficerRequests() {
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [queueFilter, setQueueFilter] = useState(() => {
    const f = searchParams.get("filter");
    return f ? f.toUpperCase() : "ALL";
  });

  useEffect(() => {
    const f = searchParams.get("filter");
    if (f) {
      setQueueFilter(f.toUpperCase());
    }
  }, [searchParams]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      setRequests(await fetchRequests());
      setError("");
    } catch (err) {
      console.error(err);
      setError("The request queue could not be refreshed. Your current view is unchanged.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const refreshQueue = async () => {
      try {
        const data = await fetchRequests();
        if (active) {
          setRequests(data);
          setError("");
        }
      } catch (err) {
        console.error("Could not refresh request queue:", err);
        if (active) setError("The request queue could not be refreshed. Your current view is unchanged.");
      } finally {
        if (active) setLoading(false);
      }
    };
    refreshQueue();
    const interval = window.setInterval(refreshQueue, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const isCompletedWork = (r) => {
    const rawStatus = (r.raw?.status || r.status || "").toUpperCase();
    return (
      rawStatus === "COMPLETED" ||
      rawStatus === "WORK_COMPLETED" ||
      r.status === "Completed" ||
      Boolean(r.completionProof || r.raw?.completion_proof)
    );
  };

  const handleDecision = async (request, decisionType, feedback, alternativeId = null, prohibitedWindow = null, newWindow = null) => {
    const statusMap = {
      APPROVED: "Approved",
      REVISION_REQUIRED: "AI Processing",
      REJECTED: "Declined",
      VERIFIED: "Completed",
      VERIFY_COMPLETED: "Completed",
    };
    const newStatus = statusMap[decisionType] || decisionType;
    const reqId = request.id || request.raw?.request_id || request.raw?.id;

    try {
      const result = await updateRequestStatus(reqId, newStatus, decisionType, feedback, alternativeId, prohibitedWindow, newWindow);

      if (result?.success && result?.data?.request) {
        const updated = result.data.request;
        setRequests((previous) => previous.map((item) => (item.id === request.id || item.id === reqId) ? {
          ...item,
          status: updated.status === "REVISION_REQUIRED" ? "AI Processing" : (statusMap[updated.status] || updated.status),
          reason: updated.officer_feedback || feedback,
          agentPlan: updated.agent_plan,
          priorityScore: updated.priority_score ?? updated.agent_plan?.priorityScore ?? item.priorityScore,
          conflict: updated.conflict !== undefined ? updated.conflict : item.conflict,
          conflictingTrains: updated.conflicting_trains || updated.agent_plan?.conflictingTrains || [],
          recommendedBlock: updated.recommended_block || updated.agent_plan?.recommendedBlock || item.recommendedBlock,
          aiExplanation: updated.ai_explanation || updated.agent_plan?.explanation || item.aiExplanation,
          alternatives: updated.alternatives || updated.agent_plan?.alternatives || item.alternatives,
          completionProof: updated.completion_proof || item.completionProof,
          raw: updated,
          prohibitedWindow: updated.prohibited_window || prohibitedWindow,
        } : item));

        // Immediately sync from backend so any periodic poll or refresh stays identical
        const freshList = await fetchRequests();
        if (Array.isArray(freshList)) {
          setRequests(freshList);
        }
        return { success: true };
      } else {
        const errMsg = result?.message || "Failed to update request status on server.";
        alert(`Error updating request: ${errMsg}`);
        return { success: false, message: errMsg };
      }
    } catch (err) {
      alert(`Unexpected error: ${err.message}`);
      return { success: false, message: err.message };
    }
  };

  const counts = useMemo(() => {
    const completedList = requests.filter(isCompletedWork);
    const standardPending = requests.filter((r) =>
      !isCompletedWork(r) &&
      !["Approved", "APPROVED", "Completed", "COMPLETED", "Rejected", "REJECTED"].includes(r.raw?.status || r.status)
    );

    return {
      ALL: requests.filter((r) => !["Approved", "APPROVED"].includes(r.raw?.status || r.status)).length,
      READY: standardPending.filter((r) => !r.conflict && !r.conflictingTrains?.length).length,
      CONFLICT: standardPending.filter((r) => r.conflict || r.conflictingTrains?.length).length,
      REVISION: standardPending.filter((r) => ["AI Processing", "Revised Plan", "REVISION_REQUIRED"].includes(r.status)).length,
      COMPLETED: completedList.length,
      APPROVED: requests.filter((r) => ["Approved", "APPROVED"].includes(r.raw?.status || r.status)).length,
    };
  }, [requests]);

  const visibleRequests = useMemo(() => requests
    .filter((request) => {
      const isComp = isCompletedWork(request);
      const isApproved = ["Approved", "APPROVED"].includes(request.raw?.status || request.status);

      if (queueFilter === "COMPLETED") {
        return isComp;
      }
      if (queueFilter === "READY") {
        if (isComp || isApproved) return false;
        return !request.conflict && !request.conflictingTrains?.length;
      }
      if (queueFilter === "CONFLICT") {
        if (isComp || isApproved) return false;
        return Boolean(request.conflict || request.conflictingTrains?.length);
      }
      if (queueFilter === "REVISION") {
        if (isComp || isApproved) return false;
        return ["AI Processing", "Revised Plan", "REVISION_REQUIRED"].includes(request.status);
      }
      if (queueFilter === "ALL") {
        // In All view: show all requests needing officer attention (pending requests and completed work submissions)
        return !isApproved;
      }
      return true;
    })
    .sort((a, b) => {
      const aComp = isCompletedWork(a);
      const bComp = isCompletedWork(b);
      if (queueFilter === "ALL" && aComp !== bComp) return aComp ? -1 : 1;
      return compareRequestsLatestFirst(a, b);
    }),
  [requests, queueFilter]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7f8]">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 pb-20 md:p-6 md:pb-8 xl:p-8">
          <div className="mx-auto max-w-5xl">
            <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-1 text-sm font-semibold text-[#49677d]">Officer planning desk</p>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#172630]">Possession requests</h1>
                <p className="mt-2 max-w-2xl text-base leading-6 text-[#5f6f79]">Review the highest-priority request first, check its evidence, then approve, modify, or decline it.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/officer/approved-requests" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#cbd6dc] bg-white px-4 text-sm font-semibold text-[#29485e] hover:bg-[#f8fbfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315b75] focus-visible:ring-offset-2">
                  <CheckCircle2 size={17} aria-hidden="true" /> Released <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">{counts.APPROVED}</span>
                </Link>
                <button type="button" onClick={loadRequests} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#315b75] px-4 text-sm font-semibold text-white hover:bg-[#25485e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315b75] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
                  <RefreshCw size={17} className={loading ? "animate-spin" : ""} aria-hidden="true" /> {loading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </header>

            {error && <div role="alert" className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"><AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{error}</span></div>}

            <section aria-labelledby="queue-heading">
              <div className="mb-4 rounded-xl border border-[#d9e1e5] bg-white p-3.5 shadow-sm shadow-slate-900/[0.03] sm:flex sm:items-center sm:justify-between sm:gap-4">
                <div className="mb-3 px-1 sm:mb-0">
                  <h2 id="queue-heading" className="text-lg font-semibold text-[#172630]">Decision queue</h2>
                  <p className="text-sm text-[#697780]">{visibleRequests.length} shown · sorted by priority</p>
                </div>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#f1f5f6] p-1 sm:flex" aria-label="Filter request queue">
                  {FILTERS.map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => setQueueFilter(value)} aria-pressed={queueFilter === value} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315b75] ${queueFilter === value ? "bg-white text-[#203f53] shadow-sm" : "text-[#60717d] hover:bg-white/70"}`}>
                      <Icon size={16} aria-hidden="true" /> {label}
                      <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs ${queueFilter === value ? "bg-[#315b75] text-white" : "bg-[#dfe7eb] text-[#526570]"}`}>{counts[value]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {loading && requests.length === 0 ? (
                <div role="status" aria-live="polite" className="space-y-3"><span className="sr-only">Loading possession requests</span>{[1, 2, 3].map((item) => <div key={item} className="h-48 animate-pulse rounded-xl border border-[#e0e5e7] bg-white" />)}</div>
              ) : counts.ALL === 0 ? (
                <div className="rounded-xl border border-dashed border-[#cad5da] bg-white px-6 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><FileCheck size={24} aria-hidden="true" /></span><h3 className="mt-4 text-lg font-semibold text-[#172630]">The decision queue is clear</h3><p className="mx-auto mt-1 max-w-md text-base leading-6 text-[#65747e]">All submitted requests have a decision. Released plans remain available with their evidence trail.</p></div>
              ) : visibleRequests.length === 0 ? (
                <div className="rounded-xl border border-[#d9e1e5] bg-white px-6 py-10 text-center"><h3 className="text-base font-semibold text-[#172630]">No requests match this filter</h3><button type="button" onClick={() => setQueueFilter("ALL")} className="mt-3 min-h-11 rounded-lg px-4 text-sm font-semibold text-[#315b75] hover:bg-[#edf4f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315b75]">Show all requests</button></div>
              ) : (
                <div className="space-y-4">
                  {visibleRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onApprove={(item, feedback, alternativeId) => handleDecision(item, "APPROVED", feedback, alternativeId)}
                      onRevision={(item, feedback, alternativeId, prohibitedWindow, newWindow) => handleDecision(item, "REVISION_REQUIRED", feedback, alternativeId, prohibitedWindow, newWindow)}
                      onDecline={(item, feedback) => handleDecision(item, "REJECTED", feedback)}
                      onVerifyCompleted={(item, feedback) => handleDecision(item, "VERIFIED", feedback)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
