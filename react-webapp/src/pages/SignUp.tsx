import React, { useState, useEffect } from "react";
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
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import {
  PasswordStrength,
  getPasswordStrength,
} from "../components/PasswordStrength";
import {
  validateForm,
  isFormValid,
  getFieldError,
  nameRules,
  emailRules,
  strongPasswordRules,
  confirmPasswordRules,
  FormValidation,
} from "../utils/validation";
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
  const [loading, setLoading] = useState(false);
  const [validation, setValidation] = useState<FormValidation>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { signUp } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Validate form on data change
  useEffect(() => {
    const fieldRules = {
      firstName: nameRules,
      lastName: nameRules,
      email: emailRules,
      password: strongPasswordRules,
      confirmPassword: confirmPasswordRules(formData.password),
    };

    const newValidation = validateForm(formData, fieldRules);
    setValidation(newValidation);
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!isFormValid(validation)) {
      error(t("auth.fixFormErrors"), t("auth.checkRequiredFields"));
      return;
    }

    // Check password strength
    const { level } = getPasswordStrength(formData.password);
    if (level === "weak") {
      error(t("auth.passwordTooWeak"), t("auth.createStrongerPassword"));
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await signUp(
        formData.email,
        formData.password,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
        }
      );

      if (signUpError) {
        error(t("auth.signUpFailed"), signUpError.message);
      } else {
        success(
          t("auth.accountCreatedSuccess"),
          t("auth.checkEmailConfirmation"),
          8000
        );
        // Navigate to sign-in after successful signup
        setTimeout(() => {
          navigate("/sign-in");
        }, 2000);
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
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-100 to-gray-200 dark:from-black dark:via-gray-800 dark:to-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
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
              <div className="p-3 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 shadow-lg animate-pulse-slow">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-center text-3xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent mb-2">
              {t("auth.joinExperience")}
            </h2>
            <p className="text-center text-sm text-gray-600 dark:text-gray-300">
              {t("auth.signUpSubtitle")}{" "}
              <Link
                to="/sign-in"
                className="font-medium text-gray-800 hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100 transition-colors"
              >
                {t("auth.orSignIn")}
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
                  {t("auth.firstName")}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors" />
                  </div>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    onBlur={() => handleBlur("firstName")}
                    className={cn(
                      "appearance-none block w-full pl-11 pr-4 py-3 border rounded-xl shadow-sm",
                      "border-gray-300 dark:border-gray-600",
                      "glassmorphism",
                      "text-gray-900 dark:text-gray-100",
                      "placeholder-gray-400 dark:placeholder-gray-500",
                      "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500",
                      "transition-all duration-300",
                      touched.firstName &&
                        getFieldError(validation, "firstName") &&
                        "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500"
                    )}
                    placeholder={t("auth.firstName")}
                  />
                </div>
                {touched.firstName &&
                  getFieldError(validation, "firstName") && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      {getFieldError(validation, "firstName")}
                    </p>
                  )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {t("auth.lastName")}
                </label>
                <div className="relative">
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    onBlur={() => handleBlur("lastName")}
                    className={cn(
                      "appearance-none block w-full px-4 py-3 border rounded-xl shadow-sm",
                      "border-gray-300 dark:border-gray-600",
                      "glassmorphism",
                      "text-gray-900 dark:text-gray-100",
                      "placeholder-gray-400 dark:placeholder-gray-500",
                      "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500",
                      "transition-all duration-300",
                      touched.lastName &&
                        getFieldError(validation, "lastName") &&
                        "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500"
                    )}
                    placeholder={t("auth.lastName")}
                  />
                </div>
                {touched.lastName && getFieldError(validation, "lastName") && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {getFieldError(validation, "lastName")}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("auth.email")}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-purple-500 dark:text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors" />
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
                    "appearance-none block w-full pl-10 pr-3 py-3 border rounded-xl shadow-sm placeholder-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500",
                    "border-gray-300 dark:border-gray-600",
                    "glassmorphism",
                    "text-gray-900 dark:text-gray-100",
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

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("auth.password")}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={() => handleBlur("password")}
                  className={cn(
                    "appearance-none block w-full pl-10 pr-10 py-3 border rounded-xl shadow-sm placeholder-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500",
                    "border-gray-300 dark:border-gray-600",
                    "glassmorphism",
                    "text-gray-900 dark:text-gray-100",
                    touched.password &&
                      getFieldError(validation, "password") &&
                      "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500"
                  )}
                  placeholder={t("auth.enterPassword")}
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

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-3">
                  <PasswordStrength password={formData.password} />
                </div>
              )}

              {touched.password && getFieldError(validation, "password") && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  {getFieldError(validation, "password")}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t("auth.confirmPassword")}
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => handleBlur("confirmPassword")}
                  className={cn(
                    "appearance-none block w-full pl-10 pr-10 py-3 border rounded-xl shadow-sm placeholder-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500",
                    "border-gray-300 dark:border-gray-600",
                    "glassmorphism",
                    "text-gray-900 dark:text-gray-100",
                    touched.confirmPassword &&
                      getFieldError(validation, "confirmPassword") &&
                      "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500"
                  )}
                  placeholder={t("auth.confirmYourPassword")}
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
              {touched.confirmPassword &&
                getFieldError(validation, "confirmPassword") && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {getFieldError(validation, "confirmPassword")}
                  </p>
                )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "btn-aura group relative w-full flex justify-center py-3 px-4 text-sm font-medium rounded-xl text-white transition-all duration-300",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    {t("auth.creatingAccount")}
                  </div>
                ) : (
                  t("auth.createAccount")
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
