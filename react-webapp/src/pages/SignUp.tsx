import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Sun,
  Moon,
  UserPlus,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../utils/cn";

export function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    // For demo purposes, navigate to activate account page
    console.log("Sign up:", formData);
    navigate("/activate-account");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-100 to-gray-200 dark:from-black dark:via-gray-800 dark:to-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
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
            <Moon className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors" />
          ) : (
            <Sun className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transition-colors" />
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="glassmorphism py-10 px-6 shadow-bw border border-gray-200/20 dark:border-gray-500/20 rounded-2xl backdrop-blur-xl">
          <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-gray-800 to-black shadow-bw animate-pulse-slow">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-center text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-black dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-2">
              Join the Experience
            </h2>
            <p className="text-center text-sm text-gray-600 dark:text-gray-300">
              Create your account to get started{" "}
              <Link
                to="/sign-in"
                className="font-medium text-gray-800 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100 transition-colors"
              >
                sign in to your existing account
              </Link>
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  First name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className={cn(
                      "appearance-none block w-full pl-11 pr-4 py-3 border rounded-xl shadow-sm",
                      "border-gray-300 dark:border-gray-600",
                      "glassmorphism",
                      "text-gray-900 dark:text-gray-100",
                      "placeholder-gray-400 dark:placeholder-gray-500",
                      "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500",
                      "transition-all duration-300"
                    )}
                    placeholder="First name"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Last name
                </label>
                <div className="relative">
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className={cn(
                      "appearance-none block w-full px-4 py-3 border rounded-xl shadow-sm",
                      "border-gray-300 dark:border-gray-600",
                      "glassmorphism",
                      "text-gray-900 dark:text-gray-100",
                      "placeholder-gray-400 dark:placeholder-gray-500",
                      "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500",
                      "transition-all duration-300"
                    )}
                    placeholder="Last name"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
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
                    "appearance-none block w-full pl-10 pr-3 py-3 border rounded-xl shadow-sm placeholder-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500",
                    "border-gray-300 dark:border-gray-600",
                    "glassmorphism",
                    "text-gray-900 dark:text-gray-100"
                  )}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={cn(
                    "appearance-none block w-full pl-10 pr-10 py-3 border rounded-xl shadow-sm placeholder-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500",
                    "border-gray-300 dark:border-gray-600",
                    "glassmorphism",
                    "text-gray-900 dark:text-gray-100"
                  )}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={cn(
                    "appearance-none block w-full pl-10 pr-10 py-3 border rounded-xl shadow-sm placeholder-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500",
                    "border-gray-300 dark:border-gray-600",
                    "glassmorphism",
                    "text-gray-900 dark:text-gray-100"
                  )}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="btn-aura group relative w-full flex justify-center py-3 px-4 text-sm font-medium rounded-xl text-white transition-all duration-300"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
