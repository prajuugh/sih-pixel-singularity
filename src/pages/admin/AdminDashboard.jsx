import { useEffect, useState } from "react";
import { Users, UserCircle2, ShieldCheck, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import Button from "../../components/common/Button";
import DeptStatsCard from "../../components/admin/DeptStatsCard";
import RecentActivityTable from "../../components/admin/RecentActivityTable";
import { useAuth } from "../../hooks/useAuth";
import {
  fetchAdminStats,
  fetchDepartmentUsage,
  fetchRecentActivity,
} from "../../utils/api";

const statIcons = [Users, UserCircle2, ShieldCheck, Settings];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    fetchAdminStats().then(setStats);
    fetchDepartmentUsage().then(setDepartments);
    fetchRecentActivity().then(setActivity);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome, <span className="text-green-700">{user?.name || "Admin"}</span>
          </h2>
          <p className="text-gray-500 mb-6">
            Manage system users and their access to the Railway Block Planning System.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            {stats.map(({ label, value }, i) => {
              const Icon = statIcons[i] || Users;
              return (
                <div
                  key={label}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4"
                >
                  <div className="bg-green-100 rounded-lg p-3">
                    <Icon className="text-green-700" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-6">
            <DeptStatsCard departments={departments} />
          </div>

          <RecentActivityTable activity={activity} />

          <Button
            icon={Users}
            fullWidth
            className="py-4"
            onClick={() => navigate("/admin/users")}
          >
            MANAGE USERS
          </Button>
        </main>
      </div>
    </div>
  );
}
