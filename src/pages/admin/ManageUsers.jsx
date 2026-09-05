import { useEffect, useState } from "react";
import {
  UserPlus,
  User,
  Lock,
  Mail,
  Building2,
  FileText,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import UserTable from "../../components/admin/UserTable";
import { fetchUsers, createUser, deleteUser } from "../../utils/api";
import { userDepartmentOptions } from "../../utils/constants";

function Field({ label, icon: Icon, required, children }) {
  return (
    <div className="mb-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
        <Icon size={16} className="text-green-800" />
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function CreateUserForm({ onClose, onCreated }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
    department: userDepartmentOptions[0],
    details: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createUser(form);
    onCreated?.(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Username" icon={User} required>
        <input
          type="text"
          value={form.username}
          onChange={handleChange("username")}
          placeholder="Enter username"
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700"
        />
      </Field>

      <Field label="Initial Password" icon={Lock} required>
        <div className="flex items-center border border-gray-200 rounded-lg px-3">
          <input
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={handleChange("password")}
            placeholder="Set an initial password"
            required
            className="w-full py-2.5 outline-none text-gray-700"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="text-gray-400"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </Field>

      <Field label="Email" icon={Mail} required>
        <input
          type="email"
          value={form.email}
          onChange={handleChange("email")}
          placeholder="name@example.com"
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700"
        />
      </Field>

      <Field label="Department" icon={Building2} required>
        <select
          value={form.department}
          onChange={handleChange("department")}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-green-800 font-medium"
        >
          {userDepartmentOptions.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </Field>

      <Field label="Details" icon={FileText}>
        <textarea
          value={form.details}
          onChange={handleChange("details")}
          rows={3}
          placeholder="Role, responsibilities, or any additional notes"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 resize-none"
        />
      </Field>

      <div className="flex gap-3 mt-6">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={UserPlus} className="flex-1">
          Create User
        </Button>
      </div>
    </form>
  );
}

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  const handleUserCreated = (form) => {
    setUsers((prev) => [
      { username: form.username, name: form.username, role: "teams", department: form.department },
      ...prev,
    ]);
    setShowCreateModal(false);
  };

  const handleDelete = async (u) => {
    await deleteUser(u.username);
    setUsers((prev) => prev.filter((x) => x.username !== u.username));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Manage Users</h2>
              <p className="text-gray-500">Create, edit, and remove system users.</p>
            </div>
            <Button icon={UserPlus} onClick={() => setShowCreateModal(true)}>
              Create New User
            </Button>
          </div>

          <Card title="All Users" icon={Users}>
            <UserTable users={users} onDelete={handleDelete} />
          </Card>
        </main>
      </div>

      {showCreateModal && (
        <Modal
          title="Create New User"
          icon={UserPlus}
          onClose={() => setShowCreateModal(false)}
        >
          <CreateUserForm
            onClose={() => setShowCreateModal(false)}
            onCreated={handleUserCreated}
          />
        </Modal>
      )}
    </div>
  );
}
