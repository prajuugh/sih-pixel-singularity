import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ allowedRole, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const allowed = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
  if (!allowed.includes(user.role)) return <Navigate to="/login" replace />;

  return children;
}
