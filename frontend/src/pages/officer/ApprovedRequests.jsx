// frontend/src/pages/officer/ApprovedRequests.jsx
import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Search,
  RotateCw,
  MapPin,
  Calendar,
  Clock,
  Wrench,
  Users,
  FileCheck,
  Sparkles,
  ArrowUpRight,
  Filter,
  ShieldCheck,
  Check,
  Copy,
  AlertTriangle,
  FileText
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import { fetchRequests } from "../../utils/api";

export default function ApprovedRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [copiedId, setCopiedId] = useState(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchRequests();
      setRequests(data);
    } catch (err) {
      console.error("Error loading approved requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Filter ONLY approved or completed requests
  const approvedList = useMemo(() => {
    return requests.filter((r) => {
      return (
        r.status === "Approved" ||
        r.status === "Completed" ||
        r.raw?.status === "APPROVED" ||
        r.raw?.status === "COMPLETED" ||
        r.raw?.status === "SCHEDULED"
      );
    });
  }, [requests]);

  // Apply search & department filters
  const filteredList = useMemo(() => {
    return approvedList.filter((r) => {
      // Dept filter
      if (deptFilter !== "ALL") {
        const d = (r.department || r.raw?.department || "").toLowerCase();
        if (!d.includes(deptFilter.toLowerCase())) return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const id = (r.id || "").toLowerCase();
      const dept = (r.department || "").toLowerCase();
      const type = (r.type || "").toLowerCase();
      const tId = (r.raw?.track_id || r.recommendedBlock?.trackId || "").toLowerCase();
      return id.includes(q) || dept.includes(q) || type.includes(q) || tId.includes(q);
    });
  }, [approvedList, searchQuery, deptFilter]);

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Metrics
  const engCount = approvedList.filter((r) => (r.department || "").includes("Eng")).length;
  const sntCount = approvedList.filter((r) => (r.department || "").includes("Signal") || (r.department || "").includes("S&T")).length;
  const trdCount = approvedList.filter((r) => (r.department || "").includes("Trac")).length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center text-green-800">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Approved Maintenance Requests & Possessions
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Authorized corridor possessions across Karnataka railway network (both initial schedules and AI-modified alternatives).
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/officer/requests"
                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 hover:text-green-800 hover:border-green-300 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-2xs"
              >
                <span>Pending Review Queue</span>
              </Link>
              <button
                onClick={loadRequests}
                disabled={loading}
                className="flex items-center gap-1.5 bg-green-800 hover:bg-green-900 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <RotateCw size={14} className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs">
              <span className="text-xs text-gray-500 font-medium">Total Approved Possessions</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-green-800">{approvedList.length}</span>
                <span className="text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">Active</span>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs">
              <span className="text-xs text-gray-500 font-medium">Engineering (Track)</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{engCount}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs">
              <span className="text-xs text-gray-500 font-medium">Signal & Telecom</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{sntCount}</p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-2xs">
              <span className="text-xs text-gray-500 font-medium">Traction (OHE)</span>
              <p className="text-2xl font-bold text-gray-900 mt-1">{trdCount}</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Request ID, Track ID (e.g. KA-T-000342), or Department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Filter size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Department:</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
              >
                <option value="ALL">All Departments</option>
                <option value="Eng">Engineering</option>
                <option value="Signal">Signal & Telecom</option>
                <option value="Trac">Traction Distribution</option>
              </select>
            </div>
          </div>

          {/* List of Approved Requests */}
          {filteredList.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center text-gray-500">
              <FileCheck size={44} className="mx-auto text-gray-400 mb-3" />
              <p className="font-semibold text-gray-700">No Approved Requests Found</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery || deptFilter !== "ALL"
                  ? "No requests match the selected search criteria."
                  : "Requests approved in the review portal will be stored here permanently."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredList.map((req) => {
                const trackId = req.raw?.track_id || req.recommendedBlock?.trackId || (req.raw?.track_ids ? req.raw.track_ids[0] : "KA-T-000342");
                const timeWindow = `${req.recommendedBlock?.startTime || req.raw?.preferred_start_time || "19:00"} - ${req.recommendedBlock?.endTime || req.raw?.preferred_end_time || "21:00"}`;
                const schedDate = req.date || req.raw?.requested_date || req.recommendedBlock?.date || "2026-09-15";
                const isModified = Boolean(req.raw?.alternative_id || req.raw?.prohibited_window);

                return (
                  <div
                    key={req.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs hover:border-green-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar */}
                      <div className="flex items-start justify-between gap-2 mb-3 pb-3 border-b border-gray-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-gray-900">
                              #{req.id}
                            </span>
                            <button
                              onClick={() => handleCopy(req.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                              title="Copy Request ID"
                            >
                              {copiedId === req.id ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                            </button>
                            <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={10} /> APPROVED
                            </span>
                          </div>
                          <h4 className="font-bold text-base text-gray-900 mt-1">
                            {req.type}
                          </h4>
                          <span className="text-xs text-gray-500 font-medium">
                            {req.department}
                          </span>
                        </div>

                        {/* Mode Badge */}
                        <div className="text-right shrink-0">
                          {isModified ? (
                            <span className="bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                              <Sparkles size={11} /> AI Modified
                            </span>
                          ) : (
                            <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                              <ShieldCheck size={11} /> Direct Approved
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Possession & Allocation Grid */}
                      <div className="grid grid-cols-2 gap-2.5 mb-3.5 text-xs">
                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium mb-0.5">
                            <MapPin size={12} className="text-blue-600" /> Track Possession
                          </span>
                          <p className="font-bold text-gray-900 font-mono text-xs">
                            {trackId}
                          </p>
                        </div>

                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium mb-0.5">
                            <Clock size={12} className="text-purple-600" /> Scheduled Window
                          </span>
                          <p className="font-bold text-gray-900 text-xs">
                            {timeWindow}
                          </p>
                        </div>

                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium mb-0.5">
                            <Calendar size={12} className="text-emerald-600" /> Scheduled Date
                          </span>
                          <p className="font-bold text-gray-900 text-xs">
                            {schedDate}
                          </p>
                        </div>

                        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium mb-0.5">
                            <Users size={12} className="text-amber-600" /> Allocated Team
                          </span>
                          <p className="font-bold text-gray-900 text-xs truncate">
                            {req.department}
                          </p>
                        </div>
                      </div>

                      {/* Officer Feedback / Approval Note */}
                      {req.reason && (
                        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-xs mb-3 text-emerald-900">
                          <span className="font-bold text-emerald-950 block mb-0.5 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Officer Approval Note:
                          </span>
                          <p className="text-emerald-800">{req.reason}</p>
                        </div>
                      )}

                      {/* AI Alternative Description if modified */}
                      {req.aiExplanation && (
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-2.5 text-[11px] text-blue-900 mb-3">
                          <span className="font-semibold block mb-0.5">Optimization Assessment:</span>
                          <p className="text-blue-800 line-clamp-2">{req.aiExplanation}</p>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                        Score: <strong>{req.priorityScore ?? 85}/100</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/officer/live-map`)}
                          className="bg-green-800 hover:bg-green-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <MapPin size={12} />
                          <span>View on Live Map</span>
                          <ArrowUpRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
