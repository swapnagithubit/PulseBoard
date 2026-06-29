import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Mail, Lock, User, UserCheck, Shield } from "lucide-react";

const Login = () => {
  const { loginUser, registerUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "Viewer" });
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    let res;
    if (isLogin) {
      res = await loginUser(formData.email, formData.password);
    } else {
      res = await registerUser(formData.name, formData.email, formData.password, formData.role);
    }

    setLoading(false);

    if (res.success) {
      navigate("/");
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleAutoFill = (role) => {
    if (role === "Admin") {
      setFormData({
        name: "",
        email: "admin@pulseboard.io",
        password: "admin123",
        role: "Admin"
      });
      setIsLogin(true);
    } else {
      setFormData({
        name: "",
        email: "viewer@pulseboard.io",
        password: "viewer123",
        role: "Viewer"
      });
      setIsLogin(true);
    }
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#060913] relative overflow-hidden">
      {/* Decorative floating blurred background shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md glass-panel p-8 rounded-3xl z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-500/25 text-white mb-3">
            <TrendingUp size={28} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-wide font-display text-white">
            PulseBoard
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-medium">
            Ingest. Monitor. Aggregate.
          </p>
        </div>

        {/* Demo Account Pills */}
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-2.5">
            Demo Portal Credentials
          </span>
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => handleAutoFill("Admin")}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/35 text-[11px] font-semibold text-indigo-300 transition duration-150 flex items-center gap-1"
            >
              <Shield size={12} /> Admin Account
            </button>
            <button
              onClick={() => handleAutoFill("Viewer")}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/35 text-[11px] font-semibold text-emerald-300 transition duration-150 flex items-center gap-1"
            >
              <UserCheck size={12} /> Viewer Account
            </button>
          </div>
        </div>

        {/* Dynamic Mode Heading */}
        <h3 className="text-lg font-bold text-white mb-6">
          {isLogin ? "Sign In" : "Create Account"}
        </h3>

        {/* Error messaging */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-xs font-semibold text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={!isLogin}
                  placeholder="Full Name"
                  className="w-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white transition placeholder-gray-500"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
              <Mail size={16} />
            </span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="Email Address"
              className="w-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white transition placeholder-gray-500"
            />
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
              <Lock size={16} />
            </span>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="Password"
              className="w-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white transition placeholder-gray-500"
            />
          </div>

          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col space-y-1.5"
              >
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                  Account Access Level
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full bg-white/5 border border-white/10 px-3.5 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-gray-300 transition"
                >
                  <option value="Viewer">Viewer (Read-Only Analytics)</option>
                  <option value="Admin">Admin (Full Control + DB Reset)</option>
                </select>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition duration-200 shadow-lg shadow-indigo-500/20"
          >
            {loading ? "Processing..." : isLogin ? "Login to PulseBoard" : "Create Account"}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs text-gray-400 hover:text-white transition font-medium"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
