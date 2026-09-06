import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Train, User, ChevronDown, LogOut, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { APP_NAME, APP_TAGLINE_1, APP_TAGLINE_2 } from "../../utils/constants";

const portalLabels = {
  admin: "ADMIN PORTAL",
  officer: "OFFICER PORTAL",
  teams: "TEAMS PORTAL",
};

const roleBadgeStyles = {
  Admin: "bg-red-100 text-red-700",
  Officer: "bg-blue-100 text-blue-700",
  Teams: "bg-green-100 text-green-700",
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
      <header className="bg-green-800 text-white flex items-center justify-between px-8 py-4 relative">
        <div className="flex items-center gap-3">
          <Train size={26} />
          <div>
            <h1 className="font-bold text-lg tracking-wide leading-tight">
              {APP_NAME}
            </h1>
            {user?.role && (
              <p className="text-xs text-green-200 tracking-wide">
                {portalLabels[user.role]}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="border-l border-green-400 pl-4 text-sm text-right leading-tight hidden sm:block">
            <p>{APP_TAGLINE_1}</p>
            <p>{APP_TAGLINE_2}</p>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2"
            >
              <div className="bg-green-700 rounded-full p-1.5">
                <User size={18} />
              </div>
              <span className="font-medium">{user?.name || user?.username}</span>
              <ChevronDown size={16} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-3 w-40 bg-white text-gray-700 rounded-lg shadow-lg overflow-hidden z-10">
                <button
                  onClick={() => {
                    setShowProfile(true);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-left"
                >
                  <User size={16} />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-left text-green-800 font-medium"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showProfile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <User size={28} className="text-green-700" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{user?.name}</h3>
              <span
                className={`mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  roleBadgeStyles[user?.role] || "bg-gray-100 text-gray-700"
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
          </div>
        </div>
      )}
    </>
  );
}