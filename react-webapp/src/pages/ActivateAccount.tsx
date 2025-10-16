import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Sun, Moon, ArrowLeft, Zap } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../utils/cn";

export function ActivateAccount() {
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      alert("Please enter the activation token");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      console.log("Account activated with token:", token);
      navigate("/dashboard");
    }, 1500);
  };

  const handleResendToken = () => {
    // Simulate resending token
    alert("Activation token has been sent to your email!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-100 to-gray-200 dark:from-black dark:via-gray-800 dark:to-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Floating orbs */}
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>

      {/* Back button */}
      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={() => navigate("/sign-up")}
          className="flex items-center px-4 py-2 glassmorphism rounded-xl hover:shadow-bw transition-all duration-300 group"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>
      </div>

      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl glassmorphism hover:shadow-bw transition-all duration-300"
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glassmorphism py-8 px-4 shadow-bw sm:rounded-2xl sm:px-10 border border-gray-200/20 dark:border-gray-500/20">
          <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 mb-4 shadow-bw">
              <Shield className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            </div>
            <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Activate Your Account
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              We've sent an activation token to your email address. Please enter
              it below to activate your account.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="token"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Activation Token
              </label>
              <div className="mt-1">
                <input
                  id="token"
                  name="token"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className={cn(
                    "appearance-none block w-full px-3 py-2 border rounded-xl shadow-sm placeholder-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500",
                    "border-gray-300 dark:border-gray-600",
                    "glassmorphism",
                    "text-gray-900 dark:text-white",
                    "text-center text-lg font-mono tracking-wider"
                  )}
                  placeholder="Enter activation token"
                  maxLength={6}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "btn-aura group relative w-full flex justify-center py-3 px-4 text-sm font-medium rounded-xl text-white",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all duration-300"
                )}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Activating...
                  </div>
                ) : (
                  "Activate Account"
                )}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendToken}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
              >
                Didn't receive the token? Resend it
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 glassmorphism border border-gray-200/20 dark:border-gray-500/20 rounded-xl">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  For Demo Purposes
                </h3>
                <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    You can use any 6-character token to activate your account
                    in this demo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
