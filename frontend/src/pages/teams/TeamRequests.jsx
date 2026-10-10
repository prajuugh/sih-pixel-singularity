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
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (form) => {
    setSubmitError("");
    setSubmitting(true);
    try {
      const result = await submitRequest(form);
      if (result.success) {
        setSubmitted(result.requestId);
        setCopied(false);
      } else {
        setSubmitError(result.message || "The request could not be submitted.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <Navbar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative min-w-0 flex-1 overflow-hidden">
          {!submitted && (
            /* Header bar — only shown when form is visible (not when map picker is open) */
            <div className="px-4 pt-4 pb-0 md:px-6 md:pt-6 xl:px-8 xl:pt-8">
              <div className="flex items-center justify-between mb-5 max-w-3xl">
                <div className="flex items-center gap-2">
                  <FileText className="text-[#b83825]" size={26} />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Submit Maintenance Request
                    </h2>
                    <p className="text-xs text-gray-500">
                      Request corridor track possession for departmental maintenance work
                    </p>
                  </div>
                </div>
                <Link
                  to="/teams/check-status"
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-2xs transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:border-green-300 hover:text-[#b83825] active:scale-[0.96]"
                >
                  <Search size={14} />
                  Check Status Tracker
                </Link>
              </div>
            </div>
          )}

          {submitted ? (
            <div className="p-4 md:p-6 xl:p-8">
              <div className="max-w-2xl bg-white border border-green-200 rounded-2xl p-8 shadow-xs text-center my-4">
                <div className="w-16 h-16 rounded-full bg-green-100 text-[#b83825] flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={36} />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Request Submitted Successfully!
                </h3>
                <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                  Your maintenance block request has been registered and transmitted to the AI Block Planning engine and Officer Review portal.
                </p>

                {/* Assigned Request ID Card */}
                <div className="mx-auto mb-8 flex w-full max-w-md items-center gap-3 rounded-xl border border-green-200 bg-green-50/70 px-4 py-3.5">
                  <div className="min-w-0 flex-1 text-left">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#b83825]">
                      Your request ID — copy this
                    </span>
                    <span className="block select-all break-all font-mono text-xl font-bold text-green-950">
                      {submitted}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyId(submitted)}
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-[#171918] px-3 py-2 text-xs font-semibold text-white transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-black active:scale-[0.96]"
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
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#171918] px-6 py-3 text-sm font-semibold text-white shadow-xs transition-[background-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-black active:scale-[0.96] sm:w-auto"
                  >
                    <PlusCircle size={18} />
                    <span>Create New Request</span>
                  </button>
                  <Link
                    to="/teams/check-status"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-gray-200 active:scale-[0.96] sm:w-auto"
                  >
                    <span>Track in Status Portal</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Form + optional map picker (all controlled inside RequestForm) */
            <div className="px-4 pb-20 md:px-6 md:pb-6 xl:px-8">
              {submitError && (
                <div role="alert" className="mb-4 max-w-3xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}
              {submitting && (
                <div role="status" className="mb-4 max-w-3xl rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                  Sending request to the planning service…
                </div>
              )}
              <RequestForm onSubmit={handleSubmit} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
