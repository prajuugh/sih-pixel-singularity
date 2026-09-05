import { useState } from "react";
import { FileText, CheckCircle2 } from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import RequestForm from "../../components/teams/RequestForm";
import { submitRequest } from "../../utils/api";

export default function TeamRequests() {
  const [submitted, setSubmitted] = useState(null);

  const handleSubmit = async (form) => {
    const result = await submitRequest(form);
    if (result.success) setSubmitted(result.requestId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="text-green-800" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Submit Request</h2>
          </div>

          {submitted && (
            <div className="max-w-3xl mb-5 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3">
              <CheckCircle2 size={18} />
              Request {submitted} submitted successfully.
            </div>
          )}

          <RequestForm onSubmit={handleSubmit} />
        </main>
      </div>
    </div>
  );
}
