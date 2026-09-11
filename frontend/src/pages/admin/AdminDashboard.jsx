import { useState } from "react";
import UserMenu from "../../components/common/UserMenu";
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
  X,
} from "lucide-react";

const initialUsers = [
  { id: 1, username: "admin", email: "admin@rbps.com", role: "Admin", department: "—" },
  { id: 2, username: "officer1", email: "officer.sharma@rbps.com", role: "Officer", department: "—" },
  { id: 3, username: "eng_team", email: "engineering@rbps.com", role: "Teams", department: "Engineering" },
  { id: 4, username: "snt_team", email: "signaltelecom@rbps.com", role: "Teams", department: "Signal & Telecom" },
  { id: 5, username: "trd_team", email: "traction@rbps.com", role: "Teams", department: "Traction" },
  { id: 6, username: "control1", email: "control@rbps.com", role: "Officer", department: "Control" },
];

const roleBadgeStyles = {
  Admin: "bg-red-100 text-red-700",
  Officer: "bg-blue-100 text-blue-700",
  Teams: "bg-green-100 text-green-700",
};

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [users, setUsers] = useState(initialUsers);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    department: "",
  });
  const [error, setError] = useState("");

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept =
      deptFilter === "All Departments" || u.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.department) {
      setError("All fields are required.");
      return;
    }
    const newUser = {
      id: users.length + 1,
      username: form.email.split("@")[0],
      email: form.email,
      role: "Teams",
      department: form.department,
    };
    setUsers((prev) => [...prev, newUser]);
    setForm({ name: "", email: "", password: "", department: "" });
    setError("");
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
          <UserMenu />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
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
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-green-800 hover:bg-green-900 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              <Plus size={16} />
              Add New User
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Users size={22} className="text-green-700" />} label="Total Users" value={users.length} delta="+2 from last month" />
          <StatCard icon={<Users size={22} className="text-green-700" />} label="Management Team" value={users.filter((u) => u.role === "Teams").length} delta="+1 from last month" />
          <StatCard icon={<Shield size={22} className="text-green-700" />} label="Officers" value={users.filter((u) => u.role === "Officer").length} delta="0 from last month" />
          <StatCard icon={<Settings size={22} className="text-green-700" />} label="Admins" value={users.filter((u) => u.role === "Admin").length} delta="+1 from last month" />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-semibold text-gray-800">
              <Users size={18} className="text-green-700" />
              Users by Department
            </div>
            <span className="text-sm text-gray-500">Total Users: {users.length}</span>
          </div>
          <DeptBar label="Engineering" count={users.filter((u) => u.department === "Engineering").length} total={users.length} />
          <DeptBar label="Signal & Telecom" count={users.filter((u) => u.department === "Signal & Telecom").length} total={users.length} />
          <DeptBar label="Traction Distribution" count={users.filter((u) => u.department === "Traction").length} total={users.length} />
          <DeptBar label="Control (Officers)" count={users.filter((u) => u.department === "Control").length} total={users.length} />
        </div>

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
                <th className="py-2 font-medium">Email</th>
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
                  <td className="py-3 text-gray-900 font-medium">{u.email}</td>
                  <td className="py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleBadgeStyles[u.role]}`}>
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
            <span>1-{filteredUsers.length} of {users.length}</span>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleAddUser}
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative"
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-1">Add New User</h3>
            <p className="text-sm text-gray-500 mb-5">
              Create a new user account for the system.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              placeholder="Enter full name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-green-600"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              placeholder="Enter email address"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-green-600"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Password</label>
            <input
              type="text"
              value={form.password}
              onChange={(e) => handleFormChange("password", e.target.value)}
              placeholder="Set an initial password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-green-600"
            />

            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={form.department}
              onChange={(e) => handleFormChange("department", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-green-600"
            >
              <option value="">Select department</option>
              <option value="Engineering">Engineering</option>
              <option value="Signal & Telecom">Signal & Telecom</option>
              <option value="Traction">Traction</option>
              <option value="Control">Control</option>
            </select>

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-green-800 hover:bg-green-900 text-white"
              >
                Add User
              </button>
            </div>
          </form>
        </div>
      )}
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
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-4 mb-3 text-sm">
      <span className="w-48 text-gray-700">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
        <div className="bg-green-700 h-2.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-28 text-right text-gray-500">
        {count} users ({pct}%)
      </span>
    </div>
  );
}