import { createContext, useState } from "react";
import { loginRequest } from "../utils/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (username, password) => {
    const result = await loginRequest(username, password);
    if (result.success) {
      setUser(result.user);
      return { success: true, role: result.user.role };
    }
    return { success: false, message: result.message };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
