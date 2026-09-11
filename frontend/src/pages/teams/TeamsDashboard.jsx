import { useEffect, useState } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  Settings,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import OperationsOverview from "../../components/common/OperationsOverview";
import { fetchDashboardStats, fetchUpcomingMaintenance } from "../../utils/api";

const statMeta = {
  total: { icon: FileText, bg: "bg-red-50", iconColor: "text-[#cf432c]" },
  pending: { icon: Clock, bg: "bg-amber-100", iconColor: "text-amber-600" },
  approved: { icon: CheckCircle2, bg: "bg-green-100", iconColor: "text-green-700" },
  active: { icon: Settings, bg: "bg-gray-100", iconColor: "text-gray-700" },
};

export default function TeamsDashboard() {
  const [stats, setStats] = useState([]);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    fetchDashboardStats().then(setStats);
    fetchUpcomingMaintenance().then(setUpcoming);
  }, []);

  const columns = [
    {
      key: "date",
      header: "Date",
      render: (item) => (
        <div className="bg-gray-50 border border-gray-200 rounded-md w-12 text-center py-1">
          <div className="font-bold text-gray-800 leading-none">{item.day}</div>
          <div className="text-[10px] text-gray-500 tracking-wide">{item.month}</div>
        </div>
      ),
    },
    { key: "time", header: "Time" },
    { key: "requestId", header: "Request ID" },
    { key: "name", header: "Maintenance Name" },
    { key: "department", header: "Department" },
    { key: "description", header: "Description" },
  ];

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
        />
      </div>
    </div>
  );
}
