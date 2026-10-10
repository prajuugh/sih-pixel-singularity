import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Users, ChevronDown, User, LogOut } from "lucide-react";
import Modal from "./Modal";

const roleBadgeStyles = {
  admin: "bg-red-100 text-red-700",
  officer: "bg-blue-100 text-blue-700",
  teams: "bg-green-100 text-green-700",
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
          className="flex items-center gap-2 rounded-lg bg-white/10 py-1 pl-1 pr-3 transition-colors duration-150 hover:bg-white/15"
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <Users size={16} strokeWidth={2} />
          </div>
          <span className="text-sm font-medium">{user?.name}</span>
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={`transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] ${showUserMenu ? "rotate-180" : ""}`}
          />
        </button>

        {showUserMenu && (
          <div className="absolute right-0 z-50 mt-2 w-44 rounded-xl bg-white p-1 shadow-[0_16px_40px_rgb(0_0_0/0.14)] ring-1 ring-black/10">
            <button
              onClick={() => {
                setShowProfile(true);
                setShowUserMenu(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-[color,background-color,transform] duration-150 hover:bg-gray-50 active:scale-[0.96]"
            >
              <User size={16} strokeWidth={2} />
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 transition-[color,background-color,transform] duration-150 hover:bg-red-50 active:scale-[0.96]"
            >
              <LogOut size={16} strokeWidth={2} />
              Logout
            </button>
          </div>
        )}
      </div>

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
