import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Train, User, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { APP_NAME, APP_TAGLINE_1, APP_TAGLINE_2 } from "../../utils/constants";
import Modal from "./Modal";

const portalLabels = {
  admin: "Administration",
  officer: "Operations",
  teams: "Maintenance team",
};

const roleBadgeStyles = {
  admin: "bg-red-100 text-red-700",
  officer: "bg-blue-100 text-blue-700",
  teams: "bg-green-100 text-green-700",
};

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <header className="relative z-20 flex min-h-16 items-center justify-between gap-3 border-b border-[#e3e5e4] bg-white px-4 py-2.5 text-[#171918] sm:px-6 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#171918] text-white">
            <Train size={19} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h1 className="max-w-[13rem] truncate text-sm font-bold leading-tight tracking-wide sm:max-w-none sm:text-lg">
              {APP_NAME}
            </h1>
            {user?.role && (
              <p className="text-xs text-gray-500">
                {portalLabels[user.role]}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-6">
          <div className="hidden border-l border-gray-200 pl-4 text-right text-sm leading-tight text-gray-500 lg:block">
            <p>{APP_TAGLINE_1}</p>
            <p>{APP_TAGLINE_2}</p>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Open user menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 hover:bg-gray-100"
            >
              <div className="rounded-full bg-[#f2f3f2] p-1.5 text-gray-600">
                <User size={18} strokeWidth={2} />
              </div>
              <span className="hidden font-medium sm:inline">{user?.name || user?.username}</span>
              <ChevronDown
                size={16}
                strokeWidth={2}
                className={`transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 z-10 mt-3 w-44 overflow-hidden rounded-xl bg-white p-1 text-gray-700 shadow-[0_16px_40px_rgb(0_0_0/0.14)] ring-1 ring-black/10">
                <button
                  onClick={() => {
                    setShowProfile(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-[color,background-color,transform] duration-150 hover:bg-gray-50 active:scale-[0.96]"
                >
                  <User size={16} strokeWidth={2} />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-medium text-[#b83825] transition-colors duration-150 hover:bg-[#fff5f2]"
                >
                  <LogOut size={16} strokeWidth={2} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showProfile && (
        <Modal onClose={() => setShowProfile(false)} maxWidth="max-w-sm">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-[#fbeae7]">
                <User size={28} strokeWidth={2} className="text-[#cf432c]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{user?.name}</h3>
              <span
                className={`mt-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                  roleBadgeStyles[user?.role?.toLowerCase()] || "bg-gray-100 text-gray-700"
                }`}
              >
                {user?.role}
              </span>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Username</span>
                <span className="text-gray-800 font-medium">{user?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Department</span>
                <span className="text-gray-800 font-medium">{user?.department || "—"}</span>
              </div>
            </div>
        </Modal>
      )}
    </>
  );
}
