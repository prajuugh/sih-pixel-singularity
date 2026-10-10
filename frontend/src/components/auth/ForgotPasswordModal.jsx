// frontend/src/components/auth/ForgotPasswordModal.jsx
import { useState, useEffect } from "react";
import { X, Mail, KeyRound, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw } from "lucide-react";
import { forgotPasswordApi, verifyOtpApi, resetPasswordApi } from "../../utils/api";

export default function ForgotPasswordModal({ onClose, onResetSuccess }) {
  // Steps: 1: USERNAME, 2: OTP, 3: NEW_PASSWORD, 4: SUCCESS
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setStatusMsg("");

    if (!username.trim()) {
      setError("Please enter your RBPS username.");
      return;
    }

    setLoading(true);
    const res = await forgotPasswordApi(username.trim());
    setLoading(false);

    if (res.success) {
      setMaskedEmail(res.emailMasked || "registered email");
      setStatusMsg(res.message);
      setCooldown(60);
      setStep(2);
    } else {
      if (res.retryAfter) {
        setCooldown(res.retryAfter);
      }
      setError(res.message || "Failed to dispatch verification code.");
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setLoading(true);
    const res = await verifyOtpApi({ username: username.trim(), otp: cleanOtp });
    setLoading(false);

    if (res.success && res.resetToken) {
      setResetToken(res.resetToken);
      setStep(3);
    } else {
      setError(res.message || "Invalid or expired verification code.");
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
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
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await resetPasswordApi({
      username: username.trim(),
      resetToken,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    setLoading(false);

    if (res.success) {
      setStep(4);
      setTimeout(() => {
        if (onResetSuccess) onResetSuccess();
        else onClose();
      }, 2000);
    } else {
      setError(res.message || "Failed to reset password.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-[#171918] px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-red-600/20 text-[#cf432c]">
              <KeyRound size={18} />
            </span>
            <div>
              <h3 className="text-base font-semibold leading-none">Password Recovery</h3>
              <p className="mt-1 text-xs text-white/60">
                {step === 1 && "Step 1 of 3: Identify Account"}
                {step === 2 && "Step 2 of 3: Enter OTP"}
                {step === 3 && "Step 3 of 3: Set New Password"}
                {step === 4 && "Completed"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Enter Username */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp}>
              <p className="text-xs text-gray-500 mb-4">
                Enter your authorized username. We will transmit a 6-digit verification code to your registered railway email address.
              </p>

              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                RBPS Username <span className="text-red-500">*</span>
              </label>
              <div className="relative mb-5 flex items-center rounded-lg border border-gray-300 px-3 py-2.5 transition focus-within:border-[#cf432c] focus-within:ring-2 focus-within:ring-[#cf432c]/10">
                <Mail size={16} className="mr-2.5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. rajesh_kumar or officer1"
                  className="w-full text-sm text-gray-800 outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-[#171918] px-5 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-black disabled:opacity-60"
                >
                  {loading ? "Sending OTP..." : "Send Verification Code"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Enter OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                <p className="font-semibold mb-0.5">Verification Code Dispatched</p>
                <p>
                  A 6-digit code was sent to <strong>{maskedEmail}</strong>. Valid for 10 minutes.
                </p>
              </div>

              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                6-Digit Verification Code <span className="text-red-500">*</span>
              </label>
              <div className="mb-4">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[8px] text-gray-900 outline-none transition focus:border-[#cf432c] focus:ring-2 focus:ring-[#cf432c]/10"
                  autoFocus
                />
              </div>

              <div className="mb-5 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800"
                >
                  <ArrowLeft size={14} /> Change username
                </button>

                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => handleRequestOtp()}
                  className="inline-flex items-center gap-1 font-semibold text-[#cf432c] hover:underline disabled:text-gray-400 disabled:no-underline"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || otp.trim().length !== 6}
                  className="rounded-lg bg-[#171918] px-5 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-black disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Reset Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <p className="text-xs text-gray-500 mb-4">
                Verification successful. Choose a strong new password for your account.
              </p>

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
                    placeholder="At least 6 characters"
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
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center rounded-lg border border-gray-300 px-3 py-2.5 transition focus-within:border-[#cf432c] focus-within:ring-2 focus-within:ring-[#cf432c]/10">
                  <Lock size={16} className="mr-2.5 text-gray-400" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
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

              <div className="flex items-center justify-between gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-[#171918] px-5 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-black disabled:opacity-60"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Success Message */}
          {step === 4 && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 size={32} strokeWidth={2} />
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Password Reset Successfully!</h4>
              <p className="mt-2 text-xs text-gray-500">
                You may now sign in using your updated password. Redirecting to login...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
