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
    const found = mockUsers.find(
      (u) => u.username === username && u.password === password
    );
    if (found) {
      // This app currently uses local mock users. A JWT left behind by an older
      // backend login would take precedence over this user's role at the API.
      localStorage.removeItem("rbps_token");
      setUser(found);
      return { success: true, role: found.role };
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
