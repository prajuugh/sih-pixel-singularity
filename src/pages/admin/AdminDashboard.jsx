import { useState } from "react";
import {
  Train,
  Calendar,
  Plus,
  Users,
  Shield,
  Settings,
  Search,
  Filter,
  Pencil,
  Trash2,
  ChevronDown,
} from "lucide-react";

const mockUsers = [
  { id: 1, username: "admin", name: "Admin User", role: "Admin", department: "—" },
  { id: 2, username: "officer1", name: "Officer Sharma", role: "Officer", department: "—" },
  { id: 3, username: "eng_team", name: "Engineering Team", role: "Teams", department: "Engineering" },
  { id: 4, username: "snt_team", name: "Signal & Telecom Team", role: "Teams", department: "Signal & Telecom" },
  { id: 5, username: "trd_team", name: "Traction Distribution Team", role: "Teams", department: "Traction" },
  { id: 6, username: "control1", name: "Control Officer", role: "Officer", department: "Control" },
];

const roleBadgeStyles = {
  Admin: "bg-red-100 text-red-700",
  Officer: "bg-blue-100 text-blue-700",
  Teams: "bg-green-100 text-green-700",
};

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");

  const filteredUsers = mockUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept =
      deptFilter === "All Departments" || u.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-800 text-white flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <Train size={26} />
          <div>
            <h1 className="font-bold text-lg leading-tight">RAILWAY BLOCK PLANNING SYSTEM</h1>
            <p className="text-xs text-green-200 tracking-wide">ADMIN PORTAL</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-sm text-right leading-tight">
            <p>Safe Tracks</p>
            <p>Reliable Journeys</p>
          </div>
          <div className="flex items-center gap-2 bg-green-700/50 rounded-full pl-1 pr-3 py-1">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <Users size={16} />
            </div>
            <span className="text-sm font-medium">Admin User</span>
            <ChevronDown size={14} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Title row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-green-700 tracking-wider mb-1">USERS</p>
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <p className="text-gray-500 text-sm mt-1">
              Manage system users and their access to the Railway Block Planning System.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2 rounded-lg">
              <Calendar size={16} />
              Wednesday, 10 September 2026
            </div>
            <button className="flex items-center gap-2 bg-green-800 hover:bg-green-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              <Plus size={16} />
              Add New User
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Users size={22} className="text-green-700" />}
            label="Total Users"
            value={12}
            delta="+2 from last month"
          />
          <StatCard
            icon={<Users size={22} className="text-green-700" />}
            label="Management Team"
            value={8}
            delta="+1 from last month"
          />
          <StatCard
            icon={<Shield size={22} className="text-green-700" />}
            label="Officers"
            value={3}
            delta="0 from last month"
          />
          <StatCard
            icon={<Settings size={22} className="text-green-700" />}
            label="Admins"
            value={1}
            delta="+1 from last month"
          />
        </div>

        {/* Users by Department */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-semibold text-gray-800">
              <Users size={18} className="text-green-700" />
              Users by Department
            </div>
            <span className="text-sm text-gray-500">Total Users: 12</span>
          </div>
          <DeptBar label="Engineering" count={4} total={12} />
          <DeptBar label="Signal & Telecom" count={3} total={12} />
          <DeptBar label="Traction Distribution" count={3} total={12} />
          <DeptBar label="Control (Officers)" count={2} total={12} />
        </div>

        {/* All Users table */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-semibold text-gray-800">
              <Users size={18} className="text-green-700" />
              All Users
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2 w-64">
                <Search size={16} className="text-gray-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search by name, username or department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full outline-none text-sm"
                />
              </div>
              <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700">
                <Filter size={14} className="text-green-700" />
                {deptFilter}
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 font-medium">#</th>
                <th className="py-2 font-medium">Username</th>
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Role</th>
                <th className="py-2 font-medium">Department</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, i) => (
                <tr key={u.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 text-gray-500">{i + 1}</td>
                  <td className="py-3 text-gray-700">{u.username}</td>
                  <td className="py-3 text-gray-900 font-medium">{u.name}</td>
                  <td className="py-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleBadgeStyles[u.role]}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 text-gray-700">{u.department}</td>
                  <td className="py-3 text-right">
                    <button className="text-green-700 hover:text-green-900 mr-3">
                      <Pencil size={16} />
                    </button>
                    <button className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              Rows per page:
              <select className="border border-gray-300 rounded px-2 py-1">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
            </div>
            <span>1-{filteredUsers.length} of {mockUsers.length}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, delta }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
      <div className="bg-green-50 rounded-lg p-2">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-green-600">{delta}</p>
      </div>
    </div>
  );
}

function DeptBar({ label, count, total }) {
  const pct = Math.round((count / total) * 100);
  return (
    <div className="flex items-center gap-4 mb-3 text-sm">
      <span className="w-48 text-gray-700">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
        <div
          className="bg-green-700 h-2.5 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-28 text-right text-gray-500">
        {count} users ({pct}%)
      </span>
    </div>
  );
}