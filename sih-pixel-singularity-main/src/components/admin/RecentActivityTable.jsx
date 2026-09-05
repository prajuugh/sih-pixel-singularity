import { Clock } from "lucide-react";
import Table from "../common/Table";
import Button from "../common/Button";
import { activityActionStyles } from "../../utils/constants";

export default function RecentActivityTable({ activity }) {
  const columns = [
    { key: "index", header: "#", render: (_row, i) => i + 1 },
    { key: "date", header: "Date & Time" },
    {
      key: "action",
      header: "Action",
      render: (a) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            activityActionStyles[a.action] || "bg-gray-100 text-gray-700"
          }`}
        >
          {a.action}
        </span>
      ),
    },
    { key: "user", header: "User" },
    { key: "details", header: "Details" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-green-800 rounded-full p-1.5">
            <Clock className="text-white" size={16} />
          </div>
          <h3 className="font-bold text-gray-900">Recent User Activity</h3>
        </div>
        <Button variant="outline" className="text-sm px-4 py-2">
          View All Activity
        </Button>
      </div>

      <Table columns={columns} rows={activity} rowKey={(row, i) => `${row.user}-${i}`} />
    </div>
  );
}
