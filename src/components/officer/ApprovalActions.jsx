import { Check, X } from "lucide-react";
import Button from "../common/Button";

export default function ApprovalActions({ onApprove, onDecline }) {
  return (
    <div className="flex gap-3 pt-2 border-t border-gray-100 mt-1">
      <Button variant="danger" icon={X} className="flex-1" onClick={onDecline}>
        Decline
      </Button>
      <Button
        variant="primary"
        icon={Check}
        className="flex-1"
        onClick={onApprove}
      >
        Approve
      </Button>
    </div>
  );
}
