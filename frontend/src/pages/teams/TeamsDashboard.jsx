import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle2,
  Settings,
  Camera,
  ClipboardCheck,
  MapPin,
  ArrowUpRight,
  Wrench,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import OperationsOverview from "../../components/common/OperationsOverview";
import { fetchDashboardStats, fetchUpcomingMaintenance } from "../../utils/api";
import { requestStatusStyles } from "../../utils/constants";

const statMeta = {
  total: { icon: FileText, bg: "bg-red-50", iconColor: "text-[#cf432c]" },
  pending: { icon: Clock, bg: "bg-amber-100", iconColor: "text-amber-700" },
  approved: { icon: Wrench, bg: "bg-emerald-100", iconColor: "text-emerald-700" },
  awaitingVerification: { icon: Camera, bg: "bg-teal-100", iconColor: "text-teal-700" },
  verifiedRestored: { icon: ShieldCheck, bg: "bg-green-100", iconColor: "text-green-700" },
  active: { icon: Wrench, bg: "bg-blue-100", iconColor: "text-blue-700" },
};

export default function TeamsDashboard() {
  const [stats, setStats] = useState([]);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    fetchDashboardStats("TEAM").then(setStats);
    fetchUpcomingMaintenance().then(setUpcoming);
  }, []);

  const totalCount = stats.find((s) => s.key === "total")?.value || 0;
  const pendingCount = stats.find((s) => s.key === "pending")?.value || 0;
  const approvedCount = stats.find((s) => s.key === "approved")?.value || 0;
  const completedCount = stats.find((s) => s.key === "completed")?.value || 0;

  const alertBanner = approvedCount > 0 ? {
    icon: CheckCircle2,
    title: "Sanctioned Maintenance Blocks Ready for Field Execution",
    count: approvedCount,
    countLabel: "Approved",
    description: "Possession windows are sanctioned. Field crews can mobilize on site and submit photographic clearance evidence upon completion.",
    to: "/teams/maintenance",
    actionText: "Open Maintenance Workspace",
  } : null;

  const columns = [
    {
      key: "date",
      header: "Date",
      className: "whitespace-nowrap w-16",
      render: (item) => (
        <div className="bg-white border border-gray-200 rounded-lg w-12 text-center py-1 shadow-2xs">
          <div className="font-bold text-gray-900 leading-none">{item.day}</div>
          <div className="text-[10px] font-semibold text-[#cf432c] tracking-wide mt-0.5">{item.month}</div>
        </div>
      ),
    },
    {
      key: "time",
      header: "Window",
      className: "whitespace-nowrap w-28",
      render: (item) => (
        <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
          {item.time}
        </span>
      ),
    },
    {
      key: "requestId",
      header: "Request ID",
      className: "whitespace-nowrap w-32",
      render: (item) => (
        <Link
          to="/teams/check-status"
          className="font-mono text-xs font-bold text-[#315b75] hover:text-[#18394e] hover:underline underline-offset-2 inline-flex items-center gap-1 group whitespace-nowrap"
          title="Track status of this request"
        >
          <span>{item.requestId}</span>
          <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      ),
    },
    {
      key: "name",
      header: "Maintenance Work",
      className: "min-w-[200px]",
      render: (item) => (
        <div className="min-w-[180px]">
          <p className="font-semibold text-gray-950 text-xs">{item.name}</p>
          <p className="text-[11px] text-gray-500 line-clamp-1">{item.description}</p>
        </div>
      ),
    },
    {
      key: "trackId",
      header: "Section / Track",
      className: "whitespace-nowrap w-36",
      render: (item) => (
        <Link
          to={`/teams/live-map?track=${encodeURIComponent(item.trackId || "")}`}
          className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-[11px] px-2 py-0.5 font-medium transition-colors whitespace-nowrap"
          title="View track on Live Map"
        >
          <MapPin size={11} className="text-slate-500 shrink-0" />
          <span>{item.trackId || "Section"}</span>
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "whitespace-nowrap w-36",
      render: (item) => {
        const isVerified = Boolean(
          item.isVerified ||
          item.completionProof?.verified_by_officer ||
          item.raw?.completion_proof?.verified_by_officer ||
          item.rawStatus === "VERIFIED"
        );
        const isComp = Boolean(
          item.isCompleted ||
          (item.rawStatus || item.status || "").toUpperCase() === "COMPLETED" ||
          item.completionProof
        );

        if (isVerified) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap">
              <CheckCircle2 size={12} className="text-emerald-700" /> Line Restored
            </span>
          );
        }
        if (isComp) {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 text-teal-800 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap">
              <Camera size={12} /> Completed · Pending Sign-off
            </span>
          );
        }
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${requestStatusStyles[item.status] || "bg-gray-100 text-gray-700"}`}>
            {item.status}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      className: "whitespace-nowrap w-32",
      render: (item) => {
        const isVerified = Boolean(
          item.isVerified ||
          item.completionProof?.verified_by_officer ||
          item.raw?.completion_proof?.verified_by_officer ||
          item.rawStatus === "VERIFIED"
        );
        const isComp = Boolean(
          item.isCompleted ||
          (item.rawStatus || item.status || "").toUpperCase() === "COMPLETED" ||
          item.completionProof
        );
        const isAppr = (item.rawStatus || item.status || "").toUpperCase() === "APPROVED";

        if (isVerified) {
          return (
            <Link
              to="/teams/maintenance?tab=COMPLETED"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap"
            >
              <CheckCircle2 size={13} />
              <span>Certified Safe</span>
              <ArrowUpRight size={12} />
            </Link>
          );
        }
        if (isAppr) {
          return (
            <Link
              to="/teams/maintenance"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap"
            >
              <Wrench size={13} />
              <span>Mark Completed</span>
              <ArrowUpRight size={12} />
            </Link>
          );
        }
        if (isComp) {
          return (
            <Link
              to="/teams/maintenance?tab=COMPLETED"
              className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap"
            >
              <Camera size={13} />
              <span>View Proof</span>
              <ArrowUpRight size={12} />
            </Link>
          );
        }
        return (
          <Link
            to="/teams/check-status"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap"
          >
            <span>Check Status</span>
            <ArrowUpRight size={12} />
          </Link>
        );
      },
    },
  ];

  const getMetricRoute = (key) => {
    if (key === "total") return "/teams/check-status";
    if (key === "pending") return "/teams/check-status";
    if (key === "approved") return "/teams/maintenance";
    if (key === "completed") return "/teams/maintenance?tab=COMPLETED";
    if (key === "awaitingVerification") return "/teams/maintenance?tab=COMPLETED";
    if (key === "verifiedRestored") return "/teams/maintenance?tab=COMPLETED";
    if (key === "active") return "/teams/maintenance";
    return null;
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <OperationsOverview
          eyebrow="Department workspace"
          title="Team overview"
          subtitle="Requests and possession windows for your department."
          stats={stats}
          statMeta={statMeta}
          upcoming={upcoming}
          columns={columns}
          calendarPath="/teams/calendar"
          getMetricRoute={getMetricRoute}
          alertBanner={alertBanner}
          tableTitle="Scheduled Possession Windows"
          tableSubtitle="Maintenance blocks and track possession status for your field crew."
        />
      </div>
    </div>
  );
}
