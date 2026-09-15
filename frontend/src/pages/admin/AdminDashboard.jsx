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
  Team: "bg-green-100 text-green-700",
};

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem("rbps_admin_users");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const seenUsernames = new Set();
          const seenEmails = new Set();
          const deduplicated = [];
          for (const u of parsed) {
            const uName = (u.username || "").trim().toLowerCase();
            const uEmail = (u.email || "").trim().toLowerCase();
            if (!seenUsernames.has(uName) && !seenEmails.has(uEmail)) {
              if (uName) seenUsernames.add(uName);
              if (uEmail) seenEmails.add(uEmail);
              deduplicated.push(u);
            }
          }
          return deduplicated;
        }
      }
    } catch (e) {
      console.warn("Could not load users from localStorage:", e);
    }
    return initialUsers;
  });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    department: "",
  });
  const [error, setError] = useState("");

  // Edit user state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "",
    department: "",
  });
  const [editError, setEditError] = useState("");

  // Delete user state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  // Persist users
  useEffect(() => {
    try {
      localStorage.setItem("rbps_admin_users", JSON.stringify(users));
    } catch (e) {
      console.warn("Could not persist users to localStorage:", e);
    }
  }, [users]);

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    const matchesSearch =
      u.email.toLowerCase().includes(term) ||
      u.username.toLowerCase().includes(term) ||
      (u.department || "").toLowerCase().includes(term) ||
      (u.role || "").toLowerCase().includes(term);
    const matchesDept =
      deptFilter === "All Departments" || u.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "role" && value === "Officer") {
        updated.department = "";
      }
      return updated;
    });
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.role) {
      setError("Name, email, password, and role are required.");
      return;
    }
    if (form.role === "Team" && !form.department) {
      setError("Please select a department for the team account.");
      return;
    }

    const candidateUsername = (form.name.trim().toLowerCase().replace(/\s+/g, "_") || form.email.split("@")[0].toLowerCase()).trim();
    const candidateRawName = form.name.trim().toLowerCase();
    const candidateEmail = form.email.trim().toLowerCase();

    // Duplication checks
    const hasDuplicateName = users.some((u) => {
      const uUsername = (u.username || "").trim().toLowerCase();
      const uName = (u.name || "").trim().toLowerCase();
      return uUsername === candidateUsername || uUsername === candidateRawName || (uName && uName === candidateRawName);
    });

    const hasDuplicateEmail = users.some((u) => {
      const uEmail = (u.email || "").trim().toLowerCase();
      return uEmail === candidateEmail;
    });

    if (hasDuplicateName && hasDuplicateEmail) {
      setError(`A user with name "${form.name.trim()}" and email "${form.email.trim()}" already exists.`);
      return;
    }
    if (hasDuplicateName) {
      setError(`Username or name "${form.name.trim()}" is already taken. Please choose a different name.`);
      return;
    }
    if (hasDuplicateEmail) {
      setError(`Email address "${form.email.trim()}" is already registered. Please use a different email.`);
      return;
    }

    const newUser = {
      id: users.length ? Math.max(...users.map((u) => u.id || 0)) + 1 : 1,
      username: candidateUsername,
      email: form.email.trim(),
      password: form.password.trim(),
      role: form.role === "Team" ? "Teams" : "Officer",
      department: form.role === "Team" ? form.department : "—",
    };
    setUsers((prev) => [...prev, newUser]);
    setForm({ name: "", email: "", password: "", role: "", department: "" });
    setError("");
    setShowModal(false);
  };

  const handleStartEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.username || "",
      email: user.email || "",
      password: user.password || "",
      role: user.role === "Teams" ? "Team" : (user.role || "Officer"),
      department: user.department === "—" ? "" : (user.department || ""),
    });
    setEditError("");
    setShowEditModal(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "role" && value !== "Team") {
        updated.department = "";
      }
      return updated;
    });
  };

  const handleUpdateUser = (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.email || !editForm.role) {
      setEditError("Name, email, and role are required.");
      return;
    }
    if (editForm.role === "Team" && !editForm.department) {
      setEditError("Please select a department for the team account.");
      return;
    }

    const candidateUsername = editForm.name.trim().toLowerCase();
    const candidateEmail = editForm.email.trim().toLowerCase();

    // Duplication checks against other users
    const hasDuplicateName = users.some((u) => {
      if (u.id === editingUser.id) return false;
      const uUsername = (u.username || "").trim().toLowerCase();
      const uName = (u.name || "").trim().toLowerCase();
      return uUsername === candidateUsername || (uName && uName === candidateUsername);
    });

    const hasDuplicateEmail = users.some((u) => {
      if (u.id === editingUser.id) return false;
      const uEmail = (u.email || "").trim().toLowerCase();
      return uEmail === candidateEmail;
    });

    if (hasDuplicateName && hasDuplicateEmail) {
      setEditError(`A user with name "${editForm.name.trim()}" and email "${editForm.email.trim()}" already exists.`);
      return;
    }
    if (hasDuplicateName) {
      setEditError(`Username or name "${editForm.name.trim()}" is already taken by another user.`);
      return;
    }
    if (hasDuplicateEmail) {
      setEditError(`Email address "${editForm.email.trim()}" is already in use by another user.`);
      return;
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              username: editForm.name.trim(),
              email: editForm.email.trim(),
              password: editForm.password?.trim() ? editForm.password.trim() : (u.password || "123456"),
              role: editForm.role === "Team" ? "Teams" : editForm.role,
              department: editForm.role === "Team" ? editForm.department : "—",
            }
          : u
      )
    );
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleStartDelete = (user) => {
    if (user.username === "admin") {
      setDeleteError("The primary administrator account cannot be deleted.");
      setDeleteTarget(user);
      setShowDeleteModal(true);
      return;
    }
    setDeleteError("");
    setDeleteTarget(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget || deleteTarget.username === "admin") return;
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setDeleteError("");
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
                    <button
                      type="button"
                      onClick={() => handleStartEdit(u)}
                      aria-label={`Edit ${u.username}`}
                      className="mr-1 inline-flex size-11 items-center justify-center rounded-lg text-[#cf432c] transition-[color,background-color,transform] duration-150 hover:bg-red-50 hover:text-[#8f2c1f] active:scale-[0.96]"
                    >
                      <Pencil size={16} strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartDelete(u)}
                      aria-label={`Delete ${u.username}`}
                      className="inline-flex size-11 items-center justify-center rounded-lg text-red-500 transition-[color,background-color,transform] duration-150 hover:bg-red-50 hover:text-red-700 active:scale-[0.96]"
                    >
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#171918] focus:ring-1 focus:ring-[#171918]"
            />

            <label htmlFor="new-user-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              id="new-user-email"
              value={form.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              placeholder="Enter email address"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#171918] focus:ring-1 focus:ring-[#171918]"
            />

            <label htmlFor="new-user-password" className="block text-sm font-medium text-gray-700 mb-1">Initial Password</label>
            <input
              type="text"
              id="new-user-password"
              value={form.password}
              onChange={(e) => handleFormChange("password", e.target.value)}
              placeholder="Set an initial password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#171918] focus:ring-1 focus:ring-[#171918]"
            />

            <label htmlFor="new-user-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              id="new-user-role"
              value={form.role}
              onChange={(e) => handleFormChange("role", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#171918] focus:ring-1 focus:ring-[#171918]"
            >
              <option value="">Select role</option>
              <option value="Team">Team</option>
              <option value="Officer">Officer</option>
            </select>

            {form.role === "Team" && (
              <>
                <label htmlFor="new-user-department" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  id="new-user-department"
                  value={form.department}
                  onChange={(e) => handleFormChange("department", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#171918] focus:ring-1 focus:ring-[#171918]"
                >
                  <option value="">Select department</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Signal & Telecom">Signal & Telecom</option>
                  <option value="Traction">Traction</option>
                  <option value="Control">Control</option>
                </select>
              </>
            )}

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
                className="px-4 py-2 text-sm"
              >
                Add User
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <Modal onClose={() => { setShowEditModal(false); setEditingUser(null); }}>
          <form onSubmit={handleUpdateUser}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Edit User</h3>
            <p className="text-sm text-gray-500 mb-5">
              Update details for user <strong className="text-gray-900">{editingUser.username}</strong>.
            </p>

            <label htmlFor="edit-user-name" className="block text-sm font-medium text-gray-700 mb-1">Username / Name</label>
            <input
              type="text"
              id="edit-user-name"
              value={editForm.name}
              onChange={(e) => handleEditFormChange("name", e.target.value)}
              placeholder="Enter username or name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#171918] focus:ring-1 focus:ring-[#171918]"
            />

            <label htmlFor="edit-user-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              id="edit-user-email"
              value={editForm.email}
              onChange={(e) => handleEditFormChange("email", e.target.value)}
              placeholder="Enter email address"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#171918] focus:ring-1 focus:ring-[#171918]"
            />

            <label htmlFor="edit-user-password" className="block text-sm font-medium text-gray-700 mb-1">New Password (leave blank to keep current)</label>
            <input
              type="text"
              id="edit-user-password"
              value={editForm.password}
              onChange={(e) => handleEditFormChange("password", e.target.value)}
              placeholder="Enter new password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#171918] focus:ring-1 focus:ring-[#171918]"
            />

            <label htmlFor="edit-user-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              id="edit-user-role"
              value={editForm.role}
              onChange={(e) => handleEditFormChange("role", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#171918] focus:ring-1 focus:ring-[#171918]"
            >
              <option value="">Select role</option>
              <option value="Team">Team</option>
              <option value="Officer">Officer</option>
              {editingUser.role === "Admin" && <option value="Admin">Admin</option>}
            </select>

            {editForm.role === "Team" && (
              <>
                <label htmlFor="edit-user-department" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  id="edit-user-department"
                  value={editForm.department}
                  onChange={(e) => handleEditFormChange("department", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm outline-none focus:border-[#171918] focus:ring-1 focus:ring-[#171918]"
                >
                  <option value="">Select department</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Signal & Telecom">Signal & Telecom</option>
                  <option value="Traction">Traction</option>
                  <option value="Control">Control</option>
                </select>
              </>
            )}

            {editError && <p className="text-red-600 text-sm mb-3">{editError}</p>}

            <div className="flex justify-end gap-3 mt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setShowEditModal(false); setEditingUser(null); }}
                className="px-4 py-2 text-sm hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-4 py-2 text-sm"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && deleteTarget && (
        <Modal onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); setDeleteError(""); }}>
          <div className="p-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-full bg-red-100 p-2.5 text-red-600">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete User</h3>
                <p className="text-xs text-gray-500">Confirm user account removal</p>
              </div>
            </div>

            {deleteError ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-5 text-sm text-red-800">
                {deleteError}
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-5">
                Are you sure you want to delete user{" "}
                <strong className="text-gray-900">{deleteTarget.username}</strong> ({deleteTarget.email})? This action cannot be undone.
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); setDeleteError(""); }}
                className="px-4 py-2 text-sm hover:bg-gray-100"
              >
                {deleteError ? "Close" : "Cancel"}
              </Button>
              {!deleteError && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 active:scale-[0.98] transition-[background-color,transform] duration-150"
                >
                  Delete User
                </button>
              )}
            </div>
          </div>
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
