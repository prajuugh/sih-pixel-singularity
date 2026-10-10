import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Train, User, Lock, Eye, EyeOff, LogIn, CheckCircle2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { APP_NAME } from "../utils/constants";
import FirstTimePasswordModal from "../components/auth/FirstTimePasswordModal";
import ForgotPasswordModal from "../components/auth/ForgotPasswordModal";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modals state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);

  const { user, login, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);
    const result = await login(username, password);
    setSubmitting(false);

    if (result.success) {
      if (result.is_first_login) {
        setPendingUser(result.user || user);
        setShowFirstTimeModal(true);
      } else {
        navigate(`/${result.role}`);
      }
    } else {
      setError(result.message);
    }
  };

  const handleFirstTimeSuccess = () => {
    setShowFirstTimeModal(false);
    updateUser({ is_first_login: false });
    const targetRole = pendingUser?.role || user?.role || "officer";
    navigate(`/${targetRole}`);
  };

  const handleResetSuccess = () => {
    setShowForgotPassword(false);
    setSuccessMsg("Password reset successfully. Please log in with your new password.");
  };

  return (
    <div className="min-h-screen bg-[#f4f6f5] p-3 sm:p-5 lg:p-7">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-6xl overflow-hidden rounded-2xl border border-[#dfe3e1] bg-white sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#171918] p-12 text-white lg:flex">
          <Link to="/" className="flex items-center gap-3 text-white no-underline">
            <span className="grid size-10 place-items-center rounded-full bg-[#171918] border border-white/20">
              <Train size={21} strokeWidth={2} />
            </span>
            <span className="text-sm font-semibold">Railway Block Planning</span>
          </Link>
          <div className="max-w-md">
            <p className="mb-5 text-sm text-white/55">India railway maintenance</p>
            <h1 className="text-[clamp(2.8rem,4.5vw,4.8rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
              Plan the block.<br />Protect the timetable.
            </h1>
          </div>
          <p className="text-sm text-white/45">Operations · Maintenance · Administration</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
          <form onSubmit={handleLogin} className="w-full max-w-sm">
            <Link to="/" className="mb-12 flex items-center gap-3 text-[#171918] no-underline lg:hidden">
              <span className="grid size-10 place-items-center rounded-full bg-[#171918] text-white">
                <Train size={21} strokeWidth={2} />
              </span>
              <span className="text-sm font-semibold">Railway Block Planning</span>
            </Link>
            <div className="mb-9">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#171918]">Sign in</h2>
              <p className="mt-2 text-sm text-gray-500">Use your authorized RBPS account.</p>
            </div>

            {successMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <label htmlFor="username" className="mb-2 block text-sm font-medium text-gray-700">Username or Email</label>
            <div className="mb-5 flex items-center rounded-lg border border-gray-300 px-3 py-3 transition-[border-color,box-shadow] duration-150 focus-within:border-[#cf432c] focus-within:ring-2 focus-within:ring-[#cf432c]/10">
              <User size={18} strokeWidth={1.5} className="mr-3 text-gray-400" />
              <input
                type="text"
                id="username"
                placeholder="Enter your username or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full outline-none text-gray-700"
              />
            </div>

            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">Password</label>
            <div className="mb-2 flex items-center rounded-lg border border-gray-300 px-3 py-2 transition-[border-color,box-shadow] duration-150 focus-within:border-[#cf432c] focus-within:ring-2 focus-within:ring-[#cf432c]/10">
              <Lock size={18} strokeWidth={1.5} className="mr-3 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full outline-none text-gray-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="relative -mr-2 size-10 rounded-lg text-gray-400 transition-[color,background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-gray-100 hover:text-gray-700 active:scale-[0.96]"
              >
                <Eye
                  size={18}
                  strokeWidth={1.5}
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[opacity,scale,filter] duration-150 ease-[cubic-bezier(0.2,0,0,1)] ${showPassword ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0"}`}
                />
                <EyeOff
                  size={18}
                  strokeWidth={1.5}
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[opacity,scale,filter] duration-150 ease-[cubic-bezier(0.2,0,0,1)] ${showPassword ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]"}`}
                />
              </button>
            </div>

            {/* Forgot Password link */}
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-xs font-semibold text-[#cf432c] hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#171918] py-3 text-base font-semibold text-white transition-colors duration-150 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={20} strokeWidth={2} />
              {submitting ? "Signing in..." : "Login"}
            </button>
            <p className="mt-8 text-xs leading-5 text-gray-400">{APP_NAME}</p>
          </form>
        </section>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPassword(false)}
          onResetSuccess={handleResetSuccess}
        />
      )}

      {/* First-Time Login Mandatory Password Setup Modal */}
      {showFirstTimeModal && (
        <FirstTimePasswordModal
          user={pendingUser || user}
          onSuccess={handleFirstTimeSuccess}
        />
      )}
    </div>
  );
}
