import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Train, User, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    const result = login(username, password);
    if (result.success) {
      navigate(`/${result.role}`);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-green-50">
      {/* Top bar */}
      <header className="bg-green-800 text-white flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <Train size={28} />
          <h1 className="font-bold text-xl tracking-wide">
            RAILWAY BLOCK PLANNING SYSTEM
          </h1>
        </div>
        <div className="border-l border-green-400 pl-4 text-sm text-right leading-tight">
          <p>Safe Tracks</p>
          <p>Reliable Journeys</p>
        </div>
      </header>

      {/* Background + card */}
      <div
        className="relative flex-1 flex items-center justify-center"
        style={{
          backgroundImage: "url('/train-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-green-50/85" />

        <form
          onSubmit={handleLogin}
          className="relative z-10 bg-white rounded-2xl shadow-xl p-10 w-full max-w-md mx-4"
        >
          <div className="flex justify-center mb-4">
            <Train size={56} className="text-green-800" />
          </div>
          <h2 className="text-center font-bold text-green-800 text-2xl mb-1">
            RAILWAY BLOCK PLANNING SYSTEM
          </h2>
          <p className="text-center text-gray-500 mb-8">Sign in to continue</p>

          <label className="block font-semibold text-gray-700 mb-1">Username</label>
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-3 mb-5">
            <User size={18} className="text-gray-400 mr-3" />
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full outline-none text-gray-700"
            />
          </div>

          <label className="block font-semibold text-gray-700 mb-1">Password</label>
          <div className="flex items-center border border-gray-300 rounded-lg px-3 py-3 mb-3">
            <Lock size={18} className="text-gray-400 mr-3" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full outline-none text-gray-700"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={18} className="text-gray-400" />
              ) : (
                <Eye size={18} className="text-gray-400" />
              )}
            </button>
          </div>

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          <div className="text-right mb-5">
            <a href="#" className="text-green-700 text-sm font-semibold hover:underline">
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            className="w-full bg-green-800 hover:bg-green-900 text-white py-3.5 rounded-lg flex items-center justify-center gap-2 font-semibold text-lg"
          >
            <LogIn size={20} />
            Login
          </button>
        </form>
      </div>
    </div>
  );
}