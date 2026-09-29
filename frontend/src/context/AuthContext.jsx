import { createContext, useState, useEffect } from "react";
import { mockUsers } from "../utils/mockUsers";
import { loginRequest } from "../utils/api";

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

  // Synchronize authentication changes across multiple tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "rbps_user") {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem("rbps_user", JSON.stringify(updated));
      return updated;
    });
  };

  const login = async (username, password) => {
    const cleanIdent = (username || "").trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    const normalizeRole = (role) => {
      const r = (role || "").toLowerCase();
      if (r === "officer") return "officer";
      if (r === "team" || r === "teams" || r === "engineer") return "teams";
      if (r === "admin") return "admin";
      return r;
    };

    // 1. Try real backend login
    try {
      const backendRes = await loginRequest(username, password);
      if (backendRes && backendRes.user) {
        if (backendRes.token) {
          localStorage.setItem("rbps_token", backendRes.token);
        }
        const normalizedRole = normalizeRole(backendRes.user.role);
        const normalizedUser = {
          ...backendRes.user,
          role: normalizedRole,
          is_first_login: Boolean(backendRes.user.is_first_login),
        };
        setUser(normalizedUser);
        return {
          success: true,
          role: normalizedRole,
          is_first_login: normalizedUser.is_first_login,
          user: normalizedUser,
        };
      }
    } catch (e) {
      console.warn("Backend auth failed, trying offline mock:", e);
    }

    // 2. Check custom users saved from Admin Dashboard
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
        is_first_login: Boolean(foundAdmin.is_first_login),
      };
      setUser(normalizedUser);
      return {
        success: true,
        role: normalizedUser.role,
        is_first_login: normalizedUser.is_first_login,
        user: normalizedUser,
      };
    }

    // 3. Check built-in mock users
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
        is_first_login: false,
      };
      setUser(normalizedUser);
      return {
        success: true,
        role: normalizedUser.role,
        is_first_login: false,
        user: normalizedUser,
      };
    }

    return { success: false, message: "Invalid username or password" };
  };

  const logout = () => {
    localStorage.removeItem("rbps_token");
    localStorage.removeItem("rbps_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
