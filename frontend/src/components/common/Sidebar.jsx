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
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const navItemsByRole = {
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/users", label: "Manage Users", icon: Users },
  ],
  officer: [
    { to: "/officer", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/officer/requests", label: "Review Requests", icon: ClipboardCheck },
    { to: "/officer/approved-requests", label: "Approved Requests", icon: CheckCircle2 },
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
    <aside className="fixed inset-x-0 bottom-0 z-30 flex h-16 w-full shrink-0 border-t border-[#e3e5e4] bg-white/95 px-2 py-2 backdrop-blur-md md:static md:h-auto md:w-20 md:flex-col md:border-r md:border-t-0 md:bg-white md:px-2 md:py-4 md:backdrop-blur-none xl:w-64 xl:px-4 xl:py-6">
      <nav className="flex w-full flex-row items-center justify-around gap-1 md:flex-col md:justify-start">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            aria-label={label}
            title={label}
            className={({ isActive }) =>
              `flex size-11 items-center justify-center rounded-lg font-medium transition-colors duration-150 md:size-12 xl:h-auto xl:w-full xl:justify-start xl:gap-3 xl:px-4 xl:py-3 ${
                isActive
                  ? "bg-[#fff5f2] text-[#b83825] shadow-[inset_0_3px_0_#cf432c] md:shadow-[inset_3px_0_0_#cf432c]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            <Icon size={20} strokeWidth={2} />
            <span className="hidden xl:inline">{label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        aria-label="Logout"
        title="Logout"
        className="mt-auto hidden size-12 items-center justify-center rounded-lg font-medium text-[#b83825] transition-colors duration-150 hover:bg-[#fff5f2] md:flex xl:h-auto xl:w-full xl:justify-start xl:gap-3 xl:px-4 xl:py-3"
      >
        <LogOut size={20} strokeWidth={2} />
        <span className="hidden xl:inline">Logout</span>
      </button>
    </aside>
  );
}
