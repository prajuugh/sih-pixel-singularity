import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import RequestCard from "../../components/officer/RequestCard";
import { fetchRequests, updateRequestStatus } from "../../utils/api";

export default function OfficerRequests() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchRequests().then(setRequests);
  }, []);

  const handleDecision = async (request, status) => {
    await updateRequestStatus(request.id, status);
    setRequests((prev) =>
      prev.map((r) => (r.id === request.id ? { ...r, status } : r))
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="text-green-800" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Requests</h2>
          </div>
          <p className="text-gray-500 mb-6">
            Review incoming maintenance requests and approve or decline them.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onApprove={(r) => handleDecision(r, "Approved")}
                onDecline={(r) => handleDecision(r, "Declined")}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
