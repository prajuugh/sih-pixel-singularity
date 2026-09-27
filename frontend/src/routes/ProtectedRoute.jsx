import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import FirstTimePasswordModal from "../components/auth/FirstTimePasswordModal";

export default function ProtectedRoute({ allowedRole, children }) {
  const { user, updateUser } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const allowed = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
  if (!allowed.includes(user.role) && user.role !== "admin") return <Navigate to="/login" replace />;

  if (user.is_first_login) {
    return (
      <div className="relative min-h-screen">
        <FirstTimePasswordModal
          user={user}
          onSuccess={() => updateUser({ is_first_login: false })}
        />
        <div className="pointer-events-none opacity-20 filter blur-sm">
          {children}
        </div>
      </div>
    );
  }

  return children;
}
