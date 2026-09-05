import { Pencil, Trash2 } from "lucide-react";
import Table from "../common/Table";

export default function UserTable({ users, onEdit, onDelete }) {
  const columns = [
    { key: "index", header: "#", render: (_row, i) => i + 1 },
    { key: "username", header: "Username" },
    { key: "name", header: "Name" },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 capitalize">
          {u.role}
        </span>
      ),
    },
    { key: "department", header: "Department", render: (u) => u.department || "—" },
    {
      key: "actions",
      header: "Actions",
      render: (u) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => onEdit?.(u)}
            className="text-green-700 hover:text-green-900"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete?.(u)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Table columns={columns} rows={users} rowKey="username" emptyMessage="No users found." />
  );
}
