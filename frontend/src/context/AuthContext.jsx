import { createContext, useState, useEffect } from "react";
import { mockUsers } from "../utils/mockUsers";
import { BASE_URL } from "../utils/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("rbps_user");
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem("rbps_user");
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("rbps_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("rbps_user");
    }
  }, [user]);

  const login = async (username, password) => {
    const trimmedInput = (username || "").trim();

    // 1. Try real backend API authentication
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedInput, username: trimmedInput, password }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.token) {
        localStorage.setItem("rbps_token", data.data.token);
        const resolvedRole = (data.data.user.role || "teams").toLowerCase();
        const loggedUser = {
          id: data.data.user.id,
          username: data.data.user.email ? data.data.user.email.split("@")[0] : data.data.user.name,
          email: data.data.user.email,
          name: data.data.user.name,
          role: resolvedRole,
          department: data.data.user.department || "—",
        };
        setUser(loggedUser);
        return { success: true, role: resolvedRole };
      }
    } catch (e) {
      console.warn("Backend auth unavailable, checking local mock store:", e);
    }

    // 2. Fallback to mock users
    const lowerInput = trimmedInput.toLowerCase();
    const found = mockUsers.find(
      (u) =>
        (u.username.toLowerCase() === lowerInput ||
          (u.email && u.email.toLowerCase() === lowerInput)) &&
        u.password === password
    );
    if (found) {
      localStorage.removeItem("rbps_token");
      setUser(found);
      return { success: true, role: found.role };
    }
    return { success: false, message: "Invalid email/username or password" };
  };

  const logout = () => {
    localStorage.removeItem("rbps_token");
    localStorage.removeItem("rbps_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
