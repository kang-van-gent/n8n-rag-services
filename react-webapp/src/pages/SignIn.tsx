import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Sun, Moon, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import {
  validateForm,
  isFormValid,
  getFieldError,
  emailRules,
  passwordRules,
  FormValidation,
} from "../utils/validation";
import { cn } from "../utils/cn";

export function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<FormValidation>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { theme, toggleTheme } = useTheme();
  const { signIn } = useAuth();
  const { error } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  // Validate form on data change
  useEffect(() => {
    const fieldRules = {
      email: emailRules,
      password: passwordRules,
    };

    const newValidation = validateForm(formData, fieldRules);
    setValidation(newValidation);
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
    });

    if (!isFormValid(validation)) {
      error(t("auth.fixFormErrors"), t("auth.checkRequiredFields"));
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await signIn(
        formData.email,
        formData.password
      );

      if (signInError) {
        error(t("auth.signInFailed"), signInError.message);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      error(t("auth.unexpectedError"), t("auth.unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleBlur = (fieldName: string) => {
    setTouched({
      ...touched,
      [fieldName]: true,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-black dark:via-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8 aura-bg relative overflow-hidden">
      {/* Floating orbs */}
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>
      <div className="floating-orb"></div>

      {/* Top controls */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-3">
        <LanguageSwitcher />
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
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg animate-pulse-slow">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-center text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
              {t("auth.welcomeBack")}
            </h2>
            <p className="text-center text-sm text-slate-600 dark:text-slate-300">
              {t("auth.signInSubtitle")}{" "}
              <Link
                to="/sign-up"
                className="font-medium text-gray-800 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white transition-colors"
              >
                {t("auth.orCreateAccount")}
              </Link>
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {t("auth.email")}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => handleBlur("email")}
                  className={cn(
                    "appearance-none block w-full pl-11 pr-4 py-3 border rounded-xl shadow-sm",
                    "border-gray-300 dark:border-gray-600",
                    "glassmorphism",
                    "text-gray-900 dark:text-gray-100",
                    "placeholder-gray-400 dark:placeholder-gray-500",
                    "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500",
                    "transition-all duration-300",
                    touched.email &&
                      getFieldError(validation, "email") &&
                      "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500"
                  )}
                  placeholder={t("auth.enterEmail")}
                />
              </div>
              {touched.email && getFieldError(validation, "email") && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {getFieldError(validation, "email")}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {t("auth.password")}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-emerald-500 dark:text-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur("password")}
                  className={cn(
                    "input-aura appearance-none block w-full pl-11 pr-12 py-3 border rounded-xl shadow-sm",
                    "border-aura-200/30 dark:border-aura-500/30",
                    "bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm",
                    "text-slate-900 dark:text-slate-100",
                    "placeholder-slate-400 dark:placeholder-slate-500",
                    "focus:outline-none focus:ring-2 focus:ring-aura-400/20 focus:border-aura-400",
                    "transition-all duration-300",
                    touched.password &&
                      getFieldError(validation, "password") &&
                      "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500"
                  )}
                  placeholder={t("auth.enterPassword")}
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
              {touched.password && getFieldError(validation, "password") && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {getFieldError(validation, "password")}
                </p>
              )}
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
                  {t("auth.rememberMe")}
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  className="font-medium text-gray-800 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white transition-colors"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "btn-aura group relative w-full flex justify-center py-3 px-6 text-sm font-semibold rounded-xl text-white shadow-bw hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gray-400/20 focus:ring-offset-2 transition-all duration-300",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    {t("auth.signingIn")}
                  </div>
                ) : (
                  <span className="relative z-10">{t("auth.signIn")}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
