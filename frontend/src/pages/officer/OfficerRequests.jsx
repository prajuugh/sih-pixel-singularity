import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileCheck, RefreshCw, RotateCcw } from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import RequestCard from "../../components/officer/RequestCard";
import { fetchRequests, updateRequestStatus } from "../../utils/api";

const FILTERS = [
  { value: "ALL", label: "All", icon: ClipboardCheck },
  { value: "READY", label: "Ready", icon: CheckCircle2 },
  { value: "CONFLICT", label: "Conflicts", icon: AlertTriangle },
  { value: "REVISION", label: "Revised", icon: RotateCcw },
];

export default function OfficerRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [queueFilter, setQueueFilter] = useState("ALL");

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

  const handleDecision = async (request, decisionType, feedback, alternativeId = null, prohibitedWindow = null) => {
    const statusMap = { APPROVED: "Approved", REVISION_REQUIRED: "AI Processing", REJECTED: "Declined" };
    const newStatus = statusMap[decisionType] || decisionType;
    const result = await updateRequestStatus(request.id, newStatus, decisionType, feedback, alternativeId, prohibitedWindow);

    if (result?.data?.request) {
      const updated = result.data.request;
      setRequests((previous) => previous.map((item) => item.id === request.id ? {
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
        raw: updated,
        prohibitedWindow: updated.prohibited_window || prohibitedWindow,
      } : item));
      return;
    }
    setRequests((previous) => previous.map((item) => item.id === request.id ? { ...item, status: newStatus, reason: feedback, prohibitedWindow } : item));
  };

  const pendingRequests = useMemo(() => requests.filter((request) => ![
    "Approved", "Completed", "APPROVED", "COMPLETED",
  ].includes(request.raw?.status || request.status)), [requests]);

  const counts = useMemo(() => ({
    ALL: pendingRequests.length,
    READY: pendingRequests.filter((request) => !request.conflict && !request.conflictingTrains?.length).length,
    CONFLICT: pendingRequests.filter((request) => request.conflict || request.conflictingTrains?.length).length,
    REVISION: pendingRequests.filter((request) => ["AI Processing", "Revised Plan", "REVISION_REQUIRED"].includes(request.status)).length,
    APPROVED: requests.filter((request) => ["Approved", "APPROVED"].includes(request.raw?.status || request.status)).length,
  }), [pendingRequests, requests]);

  const visibleRequests = useMemo(() => pendingRequests
    .filter((request) => {
      const conflict = request.conflict || request.conflictingTrains?.length;
      if (queueFilter === "CONFLICT") return Boolean(conflict);
      if (queueFilter === "REVISION") return ["AI Processing", "Revised Plan", "REVISION_REQUIRED"].includes(request.status);
      if (queueFilter === "READY") return !conflict;
      return true;
    })
    .sort((a, b) => (b.priorityScore ?? b.agentPlan?.priorityScore ?? 0) - (a.priorityScore ?? a.agentPlan?.priorityScore ?? 0)),
  [pendingRequests, queueFilter]);

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
              <div className="mb-4 rounded-xl border border-[#d9e1e5] bg-white p-3 shadow-sm shadow-slate-900/[0.03] sm:flex sm:items-center sm:justify-between sm:gap-4">
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
              ) : pendingRequests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#cad5da] bg-white px-6 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><FileCheck size={24} aria-hidden="true" /></span><h3 className="mt-4 text-lg font-semibold text-[#172630]">The decision queue is clear</h3><p className="mx-auto mt-1 max-w-md text-base leading-6 text-[#65747e]">All submitted requests have a decision. Released plans remain available with their evidence trail.</p></div>
              ) : visibleRequests.length === 0 ? (
                <div className="rounded-xl border border-[#d9e1e5] bg-white px-6 py-10 text-center"><h3 className="text-base font-semibold text-[#172630]">No requests match this filter</h3><button type="button" onClick={() => setQueueFilter("ALL")} className="mt-3 min-h-11 rounded-lg px-4 text-sm font-semibold text-[#315b75] hover:bg-[#edf4f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315b75]">Show all requests</button></div>
              ) : (
                <div className="space-y-4">
                  {visibleRequests.map((request) => <RequestCard key={request.id} request={request} onApprove={(item, feedback, alternativeId) => handleDecision(item, "APPROVED", feedback, alternativeId)} onRevision={(item, feedback, alternativeId, window) => handleDecision(item, "REVISION_REQUIRED", feedback, alternativeId, window)} onDecline={(item, feedback) => handleDecision(item, "REJECTED", feedback)} />)}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
