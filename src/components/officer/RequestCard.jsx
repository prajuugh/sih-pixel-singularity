import { requestStatusStyles } from "../../utils/constants";
import ApprovalActions from "./ApprovalActions";

export default function RequestCard({ request, onApprove, onDecline }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-gray-900">{request.type}</p>
          <p className="text-sm text-gray-500">{request.id}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
            requestStatusStyles[request.status] || "bg-gray-100 text-gray-700"
          }`}
        >
          {request.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-semibold text-gray-400">Department</p>
          <p className="text-gray-700">{request.department}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400">Date</p>
          <p className="text-gray-700">{request.date}</p>
        </div>
      </div>

      <p className="text-sm text-gray-600">{request.reason}</p>

      {request.status === "Waiting for Approval" && (
        <ApprovalActions
          onApprove={() => onApprove?.(request)}
          onDecline={() => onDecline?.(request)}
        />
      )}
    </div>
  );
}
