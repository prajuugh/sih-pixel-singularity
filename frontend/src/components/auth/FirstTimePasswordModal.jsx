// frontend/src/components/auth/FirstTimePasswordModal.jsx
import { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { changePasswordApi } from "../../utils/api";

export default function FirstTimePasswordModal({ user, onSuccess }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setSubmitting(true);
    const res = await changePasswordApi({
      username: user?.username || user?.email,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    setSubmitting(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1400);
    } else {
      setError(res.message || "Failed to update password. Please try again.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="border-b border-gray-100 bg-[#171918] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-600/20 text-[#cf432c]">
              <ShieldCheck size={24} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">First-Time Login Security</h3>
              <p className="text-xs text-white/60">Mandatory personal password setup</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={32} strokeWidth={2} />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Password Updated!</h4>
              <p className="mt-1 text-sm text-gray-500">
                Your credentials have been securely stored. Redirecting to your dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                <p className="font-semibold mb-0.5">Welcome, {user?.name || user?.username}!</p>
                <p>
                  As an authorized RBPS user logging in for the first time, you must change your temporary password before proceeding.
                </p>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* New Password */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center rounded-lg border border-gray-300 px-3 py-2.5 transition focus-within:border-[#cf432c] focus-within:ring-2 focus-within:ring-[#cf432c]/10">
                  <Lock size={16} className="mr-2.5 text-gray-400" />
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full text-sm text-gray-800 outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="mb-5">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center rounded-lg border border-gray-300 px-3 py-2.5 transition focus-within:border-[#cf432c] focus-within:ring-2 focus-within:ring-[#cf432c]/10">
                  <Lock size={16} className="mr-2.5 text-gray-400" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full text-sm text-gray-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password criteria hints */}
              <div className="mb-5 space-y-1 text-xs text-gray-500">
                <div className={`flex items-center gap-1.5 ${newPassword.length >= 6 ? "text-emerald-600 font-medium" : ""}`}>
                  <span className="text-base leading-none">{newPassword.length >= 6 ? "✓" : "•"}</span>
                  <span>At least 6 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${newPassword && newPassword === confirmPassword ? "text-emerald-600 font-medium" : ""}`}>
                  <span className="text-base leading-none">{newPassword && newPassword === confirmPassword ? "✓" : "•"}</span>
                  <span>Passwords match</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#171918] py-2.5 text-sm font-semibold text-white shadow transition hover:bg-black disabled:opacity-60"
              >
                {submitting ? "Updating Password..." : "Set Password & Continue"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
