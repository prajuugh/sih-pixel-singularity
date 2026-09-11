// frontend/src/pages/officer/OfficerRequests.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, RotateCw, CheckCircle2, Clock, AlertCircle, ArrowRight, FileCheck } from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import RequestCard from "../../components/officer/RequestCard";
import { fetchRequests, updateRequestStatus } from "../../utils/api";

export default function OfficerRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

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
    loadRequests();
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ClipboardCheck className="text-green-800" size={24} />
                <h2 className="text-2xl font-bold text-gray-900">Officer Maintenance Requests Review</h2>
              </div>
              <p className="text-gray-500 text-sm">
                Review incoming department maintenance requests, inspect train conflicts, and issue operational approvals or rescheduling directives.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                to="/officer/approved-requests"
                className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-800 hover:bg-green-100 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-2xs"
              >
                <CheckCircle2 size={14} className="text-green-600" />
                <span>Approved Requests ({approvedCount})</span>
                <ArrowRight size={13} />
              </Link>
              <button
                onClick={loadRequests}
                disabled={loading}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:border-green-300 hover:text-green-800 text-gray-700 text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                <RotateCw size={14} className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-2xs">
              <span className="text-xs text-gray-500 font-medium">Pending Queue</span>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{pendingRequests.length}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-2xs">
              <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <Clock size={12} /> Waiting for Approval
              </span>
              <p className="text-xl font-bold text-blue-800 mt-0.5">{pendingCount}</p>
            </div>
            <Link
              to="/officer/approved-requests"
              className="bg-white border border-green-100 rounded-xl p-3.5 shadow-2xs hover:border-green-300 transition-colors block group"
            >
              <span className="text-xs text-green-600 font-medium flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={12} /> Approved (Moved)
                </span>
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
              <p className="text-xl font-bold text-green-800 mt-0.5">{approvedCount}</p>
            </Link>
            <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-2xs">
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <AlertCircle size={12} /> Reschedule / Revision
              </span>
              <p className="text-xl font-bold text-amber-800 mt-0.5">{revisionCount}</p>
            </div>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center text-gray-500">
              <FileCheck size={44} className="mx-auto text-green-700 mb-3" />
              <p className="font-semibold text-gray-800 text-lg">No Pending Requests in Queue</p>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                All submitted requests have been reviewed and approved or resolved. Approved requests are safely organized in the Approved Requests portal.
              </p>
              <div className="mt-5">
                <Link
                  to="/officer/approved-requests"
                  className="inline-flex items-center gap-2 bg-green-800 hover:bg-green-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  <CheckCircle2 size={15} />
                  <span>View All Approved Requests ({approvedCount})</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {pendingRequests.map((request) => (
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

        </main>
      </div>
    </div>
  );
}
