import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Clock,
  CheckCircle2,
  Settings,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import Table from "../../components/common/Table";
import Button from "../../components/common/Button";
import { fetchDashboardStats, fetchUpcomingMaintenance } from "../../utils/api";

const statMeta = {
  total: { icon: FileText, bg: "bg-green-100", iconColor: "text-green-700" },
  pending: { icon: Clock, bg: "bg-amber-100", iconColor: "text-amber-600" },
  approved: { icon: CheckCircle2, bg: "bg-green-100", iconColor: "text-green-700" },
  active: { icon: Settings, bg: "bg-green-100", iconColor: "text-green-700" },
};

export default function OfficerDashboard() {
  const navigate = useNavigate();
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500 mb-6">Maintenance Request Overview</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {stats.map(({ key, label, value }) => {
              const meta = statMeta[key] || statMeta.total;
              const Icon = meta.icon;
              return (
                <div
                  key={key}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4"
                >
                  <div className={`${meta.bg} rounded-lg p-3`}>
                    <Icon className={meta.iconColor} size={26} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-start gap-3">
                <CalendarDays className="text-green-800 mt-1" size={24} />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Upcoming Maintenance</h3>
                  <p className="text-sm text-gray-500">
                    Scheduled maintenance tasks across all departments.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                icon={ArrowRight}
                className="text-sm px-4 py-2"
                onClick={() => navigate("/officer/calendar")}
              >
                View Calendar
              </Button>
            </div>

            <Table columns={columns} rows={upcoming} rowKey="requestId" />
          </div>
        </main>
      </div>
    </div>
  );
}
