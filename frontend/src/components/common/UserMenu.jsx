import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Users, ChevronDown, User, LogOut, X } from "lucide-react";

const roleBadgeStyles = {
  Admin: "bg-red-100 text-red-700",
  Officer: "bg-blue-100 text-blue-700",
  Teams: "bg-green-100 text-green-700",
};

export default function UserMenu() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 bg-green-700/50 rounded-full pl-1 pr-3 py-1"
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <Users size={16} />
          </div>
          <span className="text-sm font-medium">{user?.name}</span>
          <ChevronDown size={14} />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <button
              onClick={() => {
                setShowProfile(true);
                setShowUserMenu(false);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <User size={16} />
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>

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