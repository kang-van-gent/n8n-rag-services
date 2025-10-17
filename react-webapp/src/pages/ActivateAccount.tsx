import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Shield,
  Sun,
  Moon,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { supabase } from "../lib/supabase";
import { cn } from "../utils/cn";

export function ActivateAccount() {
  const [status, setStatus] = useState<"checking" | "success" | "error">(
    "checking"
  );
  const [message, setMessage] = useState("");
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const token = searchParams.get("token");
      const type = searchParams.get("type");

      if (token && type === "signup") {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: "signup",
          });

          if (error) {
            setStatus("error");
            setMessage(error.message || t("activation.confirmationFailed"));
          } else {
            setStatus("success");
            setMessage(t("activation.emailConfirmedSuccess"));
            setTimeout(() => {
              navigate("/dashboard");
            }, 2000);
          }
        } catch (err) {
          setStatus("error");
          setMessage(t("activation.unexpectedError"));
        }
      } else {
        // No token present, just show the confirmation pending message
        setStatus("success");
        setMessage(t("activation.checkEmailMessage"));
      }
    };

    handleEmailConfirmation();
  }, [searchParams, navigate]);

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
          {t("activation.back")}
        </button>
      </div>

      {/* Top controls */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <LanguageSwitcher />
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
              {status === "success" ? (
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              ) : status === "error" ? (
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              ) : (
                <Shield className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              )}
            </div>
            <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              {status === "checking"
                ? t("activation.activatingAccount")
                : status === "success"
                ? t("activation.accountActivation")
                : t("activation.activationError")}
            </h2>
          </div>

          <div className="text-center space-y-4">
            {status === "checking" && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                <span className="ml-3 text-gray-700 dark:text-gray-300">
                  {t("activation.checkingStatus")}
                </span>
              </div>
            )}

            {(status === "success" || status === "error") && (
              <div
                className={cn(
                  "p-4 rounded-xl border",
                  status === "success"
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                )}
              >
                <p
                  className={cn(
                    "text-sm",
                    status === "success"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {message}
                </p>
              </div>
            )}

            {status === "error" && (
              <button
                onClick={() => navigate("/sign-in")}
                className="btn-aura group relative flex justify-center py-3 px-6 text-sm font-medium rounded-xl text-white transition-all duration-300 mx-auto"
              >
                {t("activation.goToSignIn")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
