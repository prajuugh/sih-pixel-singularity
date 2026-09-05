import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileEdit,
  Search,
  Calendar,
  MapPin,
  Users,
  LogOut,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const navItemsByRole = {
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/users", label: "Manage Users", icon: Users },
  ],
  officer: [
    { to: "/officer", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/officer/requests", label: "Requests", icon: ClipboardCheck },
    { to: "/officer/calendar", label: "Calendar", icon: Calendar },
    { to: "/officer/live-map", label: "Live Map", icon: MapPin },
  ],
  teams: [
    { to: "/teams", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/teams/requests", label: "Submit Request", icon: FileEdit },
    { to: "/teams/check-status", label: "Check Status", icon: Search },
    { to: "/teams/calendar", label: "Calendar", icon: Calendar },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = navItemsByRole[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col py-6 px-4">
      <nav className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                isActive
                  ? "bg-green-50 text-green-800"
                  : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-auto flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-green-800 hover:bg-gray-50"
      >
        <LogOut size={20} />
        Logout
      </button>
    </aside>
  );
}
