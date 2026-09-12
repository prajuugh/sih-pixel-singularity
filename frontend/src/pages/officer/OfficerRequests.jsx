// frontend/src/pages/officer/OfficerRequests.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  FileCheck,
  Gauge,
  RotateCw,
  Route,
  ShieldCheck,
  TrainFront,
  UserRoundCheck,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import RequestCard from "../../components/officer/RequestCard";
import { fetchRequests, updateRequestStatus } from "../../utils/api";

export default function OfficerRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueFilter, setQueueFilter] = useState("ALL");

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const refreshQueue = () => {
      fetchRequests()
        .then((data) => {
          if (active) setRequests(data);
        })
        .catch((err) => console.error("Could not refresh request queue:", err))
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    refreshQueue();
    const interval = window.setInterval(() => {
      refreshQueue();
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const handleDecision = async (request, decisionType, feedback, alternativeId = null, prohibitedWindow = null) => {
    const statusMap = {
      APPROVED: "Approved",
      REVISION_REQUIRED: "AI Processing",
      REJECTED: "Declined",
    };
    const newStatus = statusMap[decisionType] || decisionType;

    const result = await updateRequestStatus(request.id, newStatus, decisionType, feedback, alternativeId, prohibitedWindow);

    if (result && result.data && result.data.request) {
      const updatedReq = result.data.request;
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id === request.id) {
            return {
              ...r,
              status: updatedReq.status === "REVISION_REQUIRED" ? "AI Processing" : (statusMap[updatedReq.status] || updatedReq.status),
              reason: updatedReq.officer_feedback || feedback,
              agentPlan: updatedReq.agent_plan,
              priorityScore: updatedReq.priority_score ?? updatedReq.agent_plan?.priorityScore ?? r.priorityScore,
              conflict: updatedReq.conflict !== undefined ? updatedReq.conflict : r.conflict,
              conflictingTrains: updatedReq.conflicting_trains || updatedReq.agent_plan?.conflictingTrains || [],
              recommendedBlock: updatedReq.recommended_block || updatedReq.agent_plan?.recommendedBlock || r.recommendedBlock,
              aiExplanation: updatedReq.ai_explanation || updatedReq.agent_plan?.explanation || r.aiExplanation,
              alternatives: updatedReq.alternatives || updatedReq.agent_plan?.alternatives || r.alternatives,
              raw: updatedReq,
              prohibitedWindow: updatedReq.prohibited_window || prohibitedWindow,
            };
          }
          return r;
        })
      );
    } else {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? { ...r, status: newStatus, reason: feedback, prohibitedWindow }
            : r
        )
      );
    }
  };

  // Filter ONLY pending / actionable requests (exclude Approved & Completed)
  const pendingRequests = requests.filter((r) => {
    const isApproved =
      r.status === "Approved" ||
      r.status === "Completed" ||
      r.raw?.status === "APPROVED" ||
      r.raw?.status === "COMPLETED";
    return !isApproved;
  });

  const pendingCount = pendingRequests.filter((r) => r.status === "Waiting for Approval").length;
  const approvedCount = requests.filter((r) => r.status === "Approved" || r.raw?.status === "APPROVED").length;
  const revisionCount = pendingRequests.filter((r) => r.status === "AI Processing").length;
  const conflictCount = pendingRequests.filter(
    (r) => r.conflict || (r.conflictingTrains && r.conflictingTrains.length > 0)
  ).length;

  const visibleRequests = useMemo(() => {
    const filtered = pendingRequests.filter((request) => {
      if (queueFilter === "CONFLICT") {
        return request.conflict || (request.conflictingTrains && request.conflictingTrains.length > 0);
      }
      if (queueFilter === "REVISION") {
        return request.status === "AI Processing" || request.status === "Revised Plan";
      }
      if (queueFilter === "READY") {
        return !request.conflict && !(request.conflictingTrains && request.conflictingTrains.length > 0);
      }
      return true;
    });

    return [...filtered].sort(
      (a, b) =>
        (b.priorityScore ?? b.agentPlan?.priorityScore ?? 0) -
        (a.priorityScore ?? a.agentPlan?.priorityScore ?? 0)
    );
  }, [pendingRequests, queueFilter]);

  const pipeline = [
    {
      name: "Request check",
      owner: "Intake desk",
      detail: "Scope, track IDs and work window read",
      icon: ClipboardCheck,
    },
    {
      name: "Timetable check",
      owner: "Traffic desk",
      detail: "Requested slot compared with train movements",
      icon: TrainFront,
    },
    {
      name: "Plan options",
      owner: "Planning desk",
      detail: "Workable possession windows ranked",
      icon: Route,
    },
    {
      name: "Safety review",
      owner: "Safety desk",
      detail: "Risk, urgency and train impact weighed",
      icon: ShieldCheck,
    },
    {
      name: "Officer decision",
      owner: "You",
      detail: "Evidence reviewed before the plan is released",
      icon: UserRoundCheck,
      human: true,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7f8]">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 pb-20 md:p-6 md:pb-8 xl:p-8">
          <div className="mx-auto max-w-[1480px]">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#49677d]">
                <CircleDot size={12} fill="currentColor" /> Officer planning desk
              </div>
              <h2 className="text-3xl font-semibold tracking-[-0.035em] text-[#1d2c38] sm:text-4xl">Possession requests</h2>
              <p className="mt-2 max-w-2xl text-base leading-6 text-[#64727d]">
                Check the timetable evidence, compare the proposed windows and make the final call.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/officer/approved-requests"
                className="flex items-center gap-1.5 rounded-lg border border-[#cdd8df] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#29485e] transition-colors hover:border-[#8fa6b6] hover:bg-[#f6fafc]"
              >
                <CheckCircle2 size={14} className="text-emerald-700" />
                <span>Released plans · {approvedCount}</span>
                <ArrowRight size={13} />
              </Link>
              <button
                onClick={loadRequests}
                disabled={loading}
                className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#315b75] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#25485e] disabled:opacity-60"
              >
                <RotateCw size={14} className={loading ? "animate-spin" : ""} />
                <span>{loading ? "Syncing" : "Sync queue"}</span>
              </button>
            </div>
          </div>

          <section className="mb-6 overflow-hidden rounded-xl border border-[#c9d6de] bg-[#e9f0f4]" aria-label="Decision pipeline">
            <div className="flex flex-col justify-between gap-4 border-b border-[#c9d6de] px-5 py-4 sm:px-6 lg:flex-row lg:items-center">
              <div>
                <h3 className="text-base font-semibold text-[#20394b]">How the case reaches you</h3>
                <p className="mt-1 text-sm leading-5 text-[#607482]">Four desks prepare the evidence. You decide whether the possession goes ahead.</p>
              </div>
              <p className="text-sm text-[#607482]">
                <strong className="font-semibold text-[#20394b]">{pendingRequests.length}</strong> waiting
                <span className="mx-2 text-[#9db0bc]">·</span>
                <strong className="font-semibold text-[#20394b]">{conflictCount}</strong> with conflicts
              </p>
            </div>

            <div className="overflow-x-auto px-5 py-5 sm:px-6">
            <ol className="relative grid min-w-[820px] grid-cols-5 gap-5 before:absolute before:left-[9%] before:right-[9%] before:top-5 before:h-px before:bg-[#afc0cb]">
              {pipeline.map((step) => {
                const Icon = step.icon;
                return (
                  <li key={step.name} className="relative pt-11">
                    <span className={`absolute left-0 top-0 z-10 grid size-10 place-items-center rounded-full border-4 border-[#e9f0f4] ${step.human ? "bg-[#315b75] text-white" : "bg-white text-[#4d7188] shadow-[0_0_0_1px_#b7c7d1]"}`}>
                      <Icon size={17} />
                    </span>
                    <p className="text-xs font-medium text-[#778b98]">{step.owner}</p>
                    <p className="mt-1 text-sm font-semibold text-[#20394b]">{step.name}</p>
                    <p className="mt-1 text-sm leading-5 text-[#607482]">{step.detail}</p>
                  </li>
                );
              })}
            </ol>
            </div>
          </section>

          <section className="mb-5 grid overflow-hidden rounded-xl border border-[#dfe2df] bg-white sm:grid-cols-2 xl:grid-cols-4" aria-label="Queue summary">
            {[
              { label: "Awaiting decision", value: pendingCount, icon: ClipboardCheck, tone: "text-[#315b75]" },
              { label: "Traffic conflicts", value: conflictCount, icon: TrainFront, tone: "text-amber-700" },
              { label: "Planner revisions", value: revisionCount, icon: Gauge, tone: "text-blue-700" },
              { label: "Released plans", value: approvedCount, icon: Check, tone: "text-emerald-700" },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="flex items-center justify-between border-b border-[#eceeec] px-4 py-3 last:border-b-0 sm:border-r sm:even:border-r-0 xl:border-b-0 xl:even:border-r xl:last:border-r-0">
                  <div>
                    <p className="text-[11px] font-medium text-gray-500">{metric.label}</p>
                    <p className="mt-0.5 text-2xl font-semibold tracking-tight text-[#171918]">{metric.value}</p>
                  </div>
                  <Icon size={18} className={metric.tone} />
                </div>
              );
            })}
          </section>

          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-semibold text-[#171918]">Decision queue</h3>
              <p className="text-xs text-gray-500">Highest operational priority appears first.</p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg border border-[#dfe2df] bg-white p-1" role="group" aria-label="Filter request queue">
              {[
                ["ALL", "All"],
                ["READY", "Clear"],
                ["CONFLICT", "Conflicts"],
                ["REVISION", "Revised"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setQueueFilter(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${queueFilter === value ? "bg-[#315b75] text-white" : "text-gray-500 hover:bg-[#edf4f7] hover:text-[#29485e]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfd3cf] bg-white px-6 py-12 text-center text-gray-500">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700"><FileCheck size={22} /></span>
              <p className="mt-4 text-lg font-semibold text-[#171918]">The control desk is clear</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-gray-500">
                Every submitted possession request has reached a decision. Released plans remain available with their full evidence trail.
              </p>
              <div className="mt-5">
                <Link
                  to="/officer/approved-requests"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#171918] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-[background-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-black active:scale-[0.96]"
                >
                  <CheckCircle2 size={15} />
                  <span>Review released plans ({approvedCount})</span>
                </Link>
              </div>
            </div>
          ) : visibleRequests.length === 0 ? (
            <div className="rounded-xl border border-[#dfe2df] bg-white px-5 py-10 text-center">
              <p className="text-sm font-semibold text-[#171918]">No cases match this view</p>
              <button type="button" onClick={() => setQueueFilter("ALL")} className="mt-2 text-xs font-semibold text-[#315b75]">Show the full queue</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
              {visibleRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onApprove={(r, f, altId) => handleDecision(r, "APPROVED", f, altId)}
                  onRevision={(r, f, altId, prohibitedWindow) =>
                    handleDecision(r, "REVISION_REQUIRED", f, altId, prohibitedWindow)
                  }
                  onDecline={(r, f) => handleDecision(r, "REJECTED", f)}
                />
              ))}
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  );
}
