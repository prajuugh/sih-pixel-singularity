import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  CheckCircle2,
  Copy,
  PlusCircle,
  Search,
  ArrowRight,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Sidebar from "../../components/common/Sidebar";
import RequestForm from "../../components/teams/RequestForm";
import { submitRequest } from "../../utils/api";

export default function TeamRequests() {
  const [submitted, setSubmitted] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (form) => {
    const result = await submitRequest(form);
    if (result.success) {
      setSubmitted(result.requestId);
      setCopied(false);
    }
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="flex items-center justify-between mb-6 max-w-3xl">
            <div className="flex items-center gap-2">
              <FileText className="text-green-800" size={26} />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {submitted ? "Request Confirmation" : "Submit Maintenance Request"}
                </h2>
                <p className="text-xs text-gray-500">
                  {submitted
                    ? "Your block possession request has been queued for evaluation"
                    : "Request corridor track possession for departmental maintenance work"}
                </p>
              </div>
            </div>
            <Link
              to="/teams/check-status"
              className="flex items-center gap-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:text-green-800 hover:border-green-300 px-3.5 py-2 rounded-lg transition-colors shadow-2xs"
            >
              <Search size={14} />
              Check Status Tracker
            </Link>
          </div>

          {/* Conditional View: After submission, ONLY show notification with Create New Request button */}
          {submitted ? (
            <div className="max-w-2xl bg-white border border-green-200 rounded-2xl p-8 shadow-xs text-center my-4">
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-800 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={36} />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Request Submitted Successfully!
              </h3>
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                Your maintenance block request has been registered and transmitted to the AI Block Planning engine and Officer Review portal.
              </p>

              {/* Assigned Request ID Card */}
              <div className="inline-flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl px-6 py-3.5 mb-8">
                <div className="text-left">
                  <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">
                    Assigned Request ID
                  </span>
                  <span className="font-mono font-bold text-green-900 text-lg">
                    {submitted}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyId(submitted)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-green-800 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Copy Request ID"
                >
                  <Copy size={13} />
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>

              {/* Action Buttons: Create New Request + Track Status */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSubmitted(null)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-800 hover:bg-green-900 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <PlusCircle size={18} />
                  <span>Create New Request</span>
                </button>
                <Link
                  to="/teams/check-status"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
                >
                  <span>Track in Status Portal</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ) : (
            /* Clean Request Submission Form */
            <div className="max-w-3xl">
              <RequestForm onSubmit={handleSubmit} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
