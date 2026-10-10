import { useEffect, useState, useMemo } from "react";
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
  ShieldCheck,
  Layers,
  Sparkles,
  TrainFront,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import OperationsOverview from "../../components/common/OperationsOverview";
import { fetchDashboardStats, fetchUpcomingMaintenance } from "../../utils/api";
import { requestStatusStyles } from "../../utils/constants";

const statMeta = {
  total: { icon: FileText, bg: "bg-red-50", iconColor: "text-[#cf432c]" },
  pending: { icon: Clock, bg: "bg-amber-100", iconColor: "text-amber-700" },
  approved: { icon: CheckCircle2, bg: "bg-emerald-100", iconColor: "text-emerald-700" },
  awaitingVerification: { icon: Camera, bg: "bg-amber-100", iconColor: "text-amber-700" },
  verifiedRestored: { icon: ShieldCheck, bg: "bg-emerald-100", iconColor: "text-emerald-700" },
  active: { icon: Settings, bg: "bg-blue-100", iconColor: "text-blue-700" },
};

export default function OfficerDashboard() {
  const [stats, setStats] = useState([]);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    fetchDashboardStats("OFFICER").then(setStats);
    fetchUpcomingMaintenance().then(setUpcoming);
  }, []);

  const pendingCount = stats.find((s) => s.key === "pending")?.value || 0;
  const approvedCount = stats.find((s) => s.key === "approved")?.value || 0;
  const awaitingCount = stats.find((s) => s.key === "awaitingVerification")?.value || 0;
  const verifiedCount = stats.find((s) => s.key === "verifiedRestored")?.value || 0;
  const completedCount = stats.find((s) => s.key === "completed")?.value || (awaitingCount + verifiedCount);

  // Only show the alert banner if there are actual submissions awaiting officer verification
  const alertBanner = awaitingCount > 0 ? {
    icon: Camera,
    title: "Field Work Completed — Photo Proof Submitted",
    count: awaitingCount,
    countLabel: "Awaiting Verification",
    description: "Engineering field crews have marked blocks finished and attached site clearance photos. Inspect evidence and certify line restoration.",
    to: "/officer/requests?filter=COMPLETED",
    actionText: "Verify & Certify Track Clear",
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
          to="/officer/requests"
          className="font-mono text-xs font-bold text-[#315b75] hover:text-[#18394e] hover:underline underline-offset-2 inline-flex items-center gap-1 group whitespace-nowrap"
          title="Open in Decision Queue"
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
          to={`/officer/live-map?track=${encodeURIComponent(item.trackId || "")}`}
          className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-[11px] px-2 py-0.5 font-medium transition-colors whitespace-nowrap"
          title="Inspect track on Live Map"
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
              <ShieldCheck size={12} className="text-emerald-700" /> Line Restored
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
              to="/officer/requests?filter=COMPLETED"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap"
            >
              <ShieldCheck size={13} />
              <span>Certified Safe</span>
              <ArrowUpRight size={12} />
            </Link>
          );
        }
        if (isComp) {
          return (
            <Link
              to="/officer/requests?filter=COMPLETED"
              className="inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap"
            >
              <Camera size={13} />
              <span>Verify Proof</span>
              <ArrowUpRight size={12} />
            </Link>
          );
        }
        if (isAppr) {
          return (
            <Link
              to="/officer/approved-requests"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap"
            >
              <CheckCircle2 size={13} />
              <span>View Sanction</span>
              <ArrowUpRight size={12} />
            </Link>
          );
        }
        return (
          <Link
            to="/officer/requests"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#cf432c] bg-red-50 border border-red-200 hover:bg-red-100 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap"
          >
            <span>Review Plan</span>
            <ArrowUpRight size={12} />
          </Link>
        );
      },
    },
  ];

  const getMetricRoute = (key) => {
    if (key === "total") return "/officer/requests";
    if (key === "pending") return "/officer/requests?filter=READY";
    if (key === "approved") return "/officer/approved-requests";
    if (key === "completed") return "/officer/requests?filter=COMPLETED";
    if (key === "awaitingVerification") return "/officer/requests?filter=COMPLETED";
    if (key === "verifiedRestored") return "/officer/requests?filter=COMPLETED";
    if (key === "active") return "/officer/approved-requests";
    return null;
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <OperationsOverview
          eyebrow="Officer control"
          title="Operations overview"
          subtitle="Maintenance requests and upcoming possession windows across the network."
          stats={stats}
          statMeta={statMeta}
          upcoming={upcoming}
          columns={columns}
          calendarPath="/officer/calendar"
          getMetricRoute={getMetricRoute}
          alertBanner={alertBanner}
        />
      </div>
    </div>
  );
}
