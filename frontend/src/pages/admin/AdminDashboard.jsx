import { useState, useEffect } from "react";
import {
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
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import Navbar from "../../components/common/Navbar";
import { fetchUsers, createUser } from "../../utils/api";

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
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Teams",
    department: "Engineering",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetchUsers().then((res) => {
      if (active && Array.isArray(res) && res.length > 0) {
        setUsers(res);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.department || "").toLowerCase().includes(search.toLowerCase());
    const matchesDept =
      deptFilter === "All Departments" || u.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleChange = (selectedRole) => {
    setForm((prev) => ({
      ...prev,
      role: selectedRole,
      department: selectedRole === "Officer" ? "Any Department" : "Engineering",
    }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("Name, email, and password are required.");
      return;
    }
    setSaving(true);
    setError("");
    const result = await createUser(form);
    setSaving(false);
    if (result.success && result.data) {
      setUsers((prev) => [
        result.data,
        ...prev.filter((u) => (u.email || "").toLowerCase() !== (result.data.email || "").toLowerCase()),
      ]);
      setForm({ name: "", email: "", password: "", role: "Teams", department: "Engineering" });
      setError("");
      setShowModal(false);
    } else {
      setError(result.message || "Failed to add user.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 xl:px-8 xl:py-8">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 lg:flex-row">
          <div>
            <p className="mb-1 text-xs font-semibold text-[#cf432c]">Administration</p>
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <p className="text-gray-500 text-sm mt-1">
              Manage system users and their access to the Railway Block Planning System.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
              <Calendar size={16} />
              Wednesday, 10 September 2026
            </div>
            <Button
              onClick={() => setShowModal(true)}
              icon={Plus}
              className="bg-[#171918] px-4 py-2 text-sm hover:bg-black"
            >
              Add New User
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04),0_16px_40px_rgb(15_23_42/0.06)] ring-1 ring-black/[0.06] lg:grid-cols-4">
          <StatCard icon={<Users size={22} className="text-[#cf432c]" />} label="Total Users" value={users.length} delta="+2 from last month" />
          <StatCard icon={<Users size={22} className="text-[#cf432c]" />} label="Management Team" value={users.filter((u) => u.role === "Teams").length} delta="+1 from last month" />
          <StatCard icon={<Shield size={22} className="text-[#cf432c]" />} label="Officers" value={users.filter((u) => u.role === "Officer").length} delta="0 from last month" />
          <StatCard icon={<Settings size={22} className="text-[#cf432c]" />} label="Admins" value={users.filter((u) => u.role === "Admin").length} delta="+1 from last month" />
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.04)] ring-1 ring-black/[0.05]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-semibold text-gray-800">
              <Users size={18} className="text-[#cf432c]" />
              Users by Department
            </div>
            <span className="text-sm text-gray-500">Total Users: {users.length}</span>
          </div>
          <DeptBar label="Engineering" count={users.filter((u) => u.department === "Engineering").length} total={users.length} />
          <DeptBar label="Signal & Telecom" count={users.filter((u) => u.department === "Signal & Telecom").length} total={users.length} />
          <DeptBar label="Traction Distribution" count={users.filter((u) => u.department === "Traction").length} total={users.length} />
          <DeptBar label="Control (Officers)" count={users.filter((u) => u.department === "Control").length} total={users.length} />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.04)] ring-1 ring-black/[0.05]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-semibold text-gray-800">
              <Users size={18} className="text-[#cf432c]" />
              All Users
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex w-64 items-center rounded-lg border border-gray-300 px-3 py-2 transition-[border-color,box-shadow] duration-150 focus-within:border-[#cf432c] focus-within:ring-2 focus-within:ring-[#cf432c]/15">
                <Search size={16} className="text-gray-400 mr-2" />
                <input
                  type="text"
                  aria-label="Search users"
                  placeholder="Search by name, username or department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full outline-none text-sm"
                />
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700">
                <Filter size={14} className="text-[#cf432c]" />
                <select
                  aria-label="Filter users by department"
                  value={deptFilter}
                  onChange={(event) => setDeptFilter(event.target.value)}
                  className="appearance-none bg-transparent pr-5 outline-none"
                >
                  <option>All Departments</option>
                  <option>Engineering</option>
                  <option>Signal & Telecom</option>
                  <option>Traction</option>
                  <option>Control</option>
                  <option>Any Department</option>
                </select>
                <ChevronDown size={14} className="-ml-5 pointer-events-none" />
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
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
                <tr key={u.id} className="border-b border-gray-100 transition-colors duration-150 last:border-0 hover:bg-gray-50/70">
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
                    <button aria-label={`Edit ${u.username}`} className="mr-1 inline-flex size-11 items-center justify-center rounded-lg text-[#cf432c] transition-[color,background-color,transform] duration-150 hover:bg-red-50 hover:text-[#8f2c1f] active:scale-[0.96]">
                      <Pencil size={16} strokeWidth={2} />
                    </button>
                    <button aria-label={`Delete ${u.username}`} className="inline-flex size-11 items-center justify-center rounded-lg text-red-500 transition-[color,background-color,transform] duration-150 hover:bg-red-50 hover:text-red-700 active:scale-[0.96]">
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              Rows per page:
              <select aria-label="Rows per page" className="border border-gray-300 rounded px-2 py-1">
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
        <Modal onClose={() => setShowModal(false)}>
          <form onSubmit={handleAddUser}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Add New User</h3>
            <p className="text-sm text-gray-500 mb-5">
              Create a new user account for the system.
            </p>

            <label htmlFor="new-user-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              id="new-user-name"
              value={form.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              placeholder="Enter full name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#cf432c]"
            />

            <label htmlFor="new-user-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              id="new-user-email"
              value={form.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              placeholder="Enter email address"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#cf432c]"
            />

            <label htmlFor="new-user-password" className="block text-sm font-medium text-gray-700 mb-1">Initial Password</label>
            <input
              type="text"
              id="new-user-password"
              value={form.password}
              onChange={(e) => handleFormChange("password", e.target.value)}
              placeholder="Set an initial password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#cf432c]"
            />

            <label htmlFor="new-user-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              id="new-user-role"
              value={form.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#cf432c]"
            >
              <option value="Teams">Teams (Field/Maintenance Staff)</option>
              <option value="Officer">Officer (Approving Authority)</option>
            </select>

            <label htmlFor="new-user-department" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              id="new-user-department"
              value={form.department}
              onChange={(e) => handleFormChange("department", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#cf432c]"
            >
              {form.role === "Teams" ? (
                <>
                  <option value="Engineering">Engineering</option>
                  <option value="Signal & Telecom">Signal & Telecom</option>
                  <option value="Traction">Traction</option>
                </>
              ) : (
                <>
                  <option value="Any Department">Any Department</option>
                </>
              )}
            </select>

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <div className="flex justify-end gap-3 mt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm"
              >
                {saving ? "Adding..." : "Add User"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, delta }) {
  return (
    <div className="flex min-w-0 items-start gap-3 border-b border-r border-gray-100 p-4 sm:p-5">
      <div className="rounded-xl bg-red-50 p-2.5">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-semibold tracking-tight text-gray-950">{value}</p>
        <p className="text-xs text-gray-500">{delta}</p>
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
        <div className="h-2.5 rounded-full bg-[#171918]" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-28 text-right text-gray-500">
        {count} users ({pct}%)
      </span>
    </div>
  );
}
