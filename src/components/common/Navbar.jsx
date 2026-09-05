import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Train, User, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { APP_NAME, APP_TAGLINE_1, APP_TAGLINE_2 } from "../../utils/constants";

const portalLabels = {
  admin: "ADMIN PORTAL",
  officer: "OFFICER PORTAL",
  teams: "TEAMS PORTAL",
};

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
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
              <button className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-left">
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
  );
}
