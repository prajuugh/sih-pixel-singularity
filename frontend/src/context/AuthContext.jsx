import { createContext, useState, useEffect } from "react";
import { mockUsers } from "../utils/mockUsers";

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

  const login = (username, password) => {
    const cleanIdent = (username || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    const normalizeRole = (role) => {
      const r = (role || "").toLowerCase();
      if (r === "officer") return "officer";
      if (r === "team" || r === "teams") return "teams";
      if (r === "admin") return "admin";
      return r;
    };

    // 1. Check custom users saved from Admin Dashboard
    let adminUsers = [];
    try {
      const stored = localStorage.getItem("rbps_admin_users");
      if (stored) adminUsers = JSON.parse(stored);
    } catch (e) {
      console.warn("Could not read rbps_admin_users:", e);
    }

    const foundAdmin = adminUsers.find((u) => {
      const uname = (u.username || "").trim().toLowerCase();
      const uemail = (u.email || "").trim().toLowerCase();
      const unameDisplay = (u.name || "").trim().toLowerCase();
      const matchIdent = uname === cleanIdent || uemail === cleanIdent || unameDisplay === cleanIdent;
      const expectedPass = (u.password || "123456").trim();
      return matchIdent && expectedPass === cleanPassword;
    });

    if (foundAdmin) {
      localStorage.removeItem("rbps_token");
      const normalizedUser = {
        ...foundAdmin,
        role: normalizeRole(foundAdmin.role),
      };
      setUser(normalizedUser);
      return { success: true, role: normalizedUser.role };
    }

    // 2. Check built-in mock users
    const foundMock = mockUsers.find((u) => {
      const uname = (u.username || "").trim().toLowerCase();
      const uemail = (u.email || "").trim().toLowerCase();
      const matchIdent = uname === cleanIdent || (uemail && uemail === cleanIdent);
      return matchIdent && u.password === cleanPassword;
    });

    if (foundMock) {
      localStorage.removeItem("rbps_token");
      const normalizedUser = {
        ...foundMock,
        role: normalizeRole(foundMock.role),
      };
      setUser(normalizedUser);
      return { success: true, role: normalizedUser.role };
    }

    return { success: false, message: "Invalid username or password" };
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
