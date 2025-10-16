import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../utils/cn";

export function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For demo purposes, just navigate to dashboard
    console.log("Sign in:", formData);
    navigate("/dashboard");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-black dark:via-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8 aura-bg relative overflow-hidden">
      {/* Floating orbs */}
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>

      {/* Theme toggle */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-xl glassmorphism hover:shadow-bw transition-all duration-300 group"
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5 text-gray-600 group-hover:text-gray-700 transition-colors" />
          ) : (
            <Sun className="w-5 h-5 text-gray-300 group-hover:text-gray-100 transition-colors" />
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glassmorphism py-10 px-6 shadow-2xl border border-gray-200/20 dark:border-gray-500/20 rounded-2xl backdrop-blur-xl card-aura">
          <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-gray-800 to-black shadow-bw animate-pulse-slow">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-center text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-black dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-2">
              Welcome Back
            </h2>
            <p className="text-center text-sm text-slate-600 dark:text-slate-300">
              Sign in to continue your journey{" "}
              <Link
                to="/sign-up"
                className="font-medium text-gray-800 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white transition-colors"
              >
                or create an account
              </Link>
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Email address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={cn(
                    "input-aura appearance-none block w-full pl-11 pr-4 py-3 border rounded-xl shadow-sm",
                    "border-gray-200/30 dark:border-gray-500/30",
                    "bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm",
                    "text-gray-900 dark:text-gray-100",
                    "placeholder-gray-400 dark:placeholder-gray-500",
                    "focus:outline-none focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400",
                    "transition-all duration-300"
                  )}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-aura-400 group-hover:text-aura-500 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={cn(
                    "input-aura appearance-none block w-full pl-11 pr-12 py-3 border rounded-xl shadow-sm",
                    "border-aura-200/30 dark:border-aura-500/30",
                    "bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm",
                    "text-slate-900 dark:text-slate-100",
                    "placeholder-slate-400 dark:placeholder-slate-500",
                    "focus:outline-none focus:ring-2 focus:ring-aura-400/20 focus:border-aura-400",
                    "transition-all duration-300"
                  )}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-aura-500 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded transition-colors"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-3 block text-sm text-slate-700 dark:text-slate-300"
                >
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  className="font-medium text-gray-800 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="btn-aura group relative w-full flex justify-center py-3 px-6 text-sm font-semibold rounded-xl text-white shadow-bw hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-400/20 focus:ring-offset-2 transition-all duration-300"
              >
                <span className="relative z-10">Sign In</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
