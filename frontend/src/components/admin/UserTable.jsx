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
            aria-label={`Edit ${u.username}`}
            className="inline-flex size-11 items-center justify-center rounded-lg text-green-700 transition-[color,background-color,transform] duration-150 hover:bg-green-50 hover:text-[#8f2c1f] active:scale-[0.96]"
          >
            <Pencil size={16} strokeWidth={2} />
          </button>
          <button
            onClick={() => onDelete?.(u)}
            aria-label={`Delete ${u.username}`}
            className="inline-flex size-11 items-center justify-center rounded-lg text-red-500 transition-[color,background-color,transform] duration-150 hover:bg-red-50 hover:text-red-700 active:scale-[0.96]"
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Table columns={columns} rows={users} rowKey="username" emptyMessage="No users found." />
  );
}
