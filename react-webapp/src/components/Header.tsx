import React from "react";
import { Menu, Sun, Moon, Sparkles, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { cn } from "../utils/cn";

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
}

export function Header({ onToggleSidebar, title = "Dashboard" }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();

  const displayName =
    user?.user_metadata?.first_name ||
    user?.email?.split("@")[0] ||
    t("common.user");

  return (
    <header className="glassmorphism border-b border-gray-200/20 dark:border-gray-500/20 px-6 py-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5"></div>
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2.5 rounded-xl glassmorphism hover:shadow-lg transition-all duration-300 group hover:bg-blue-50 dark:hover:bg-blue-900/20"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 animate-pulse-slow shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              {t(`navigation.${title.toLowerCase()}`, title)}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* User Profile */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl glassmorphism hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 transition-all duration-300 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {displayName}
            </span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl glassmorphism hover:shadow-lg transition-all duration-300 group hover:bg-orange-50 dark:hover:bg-orange-900/20"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5 text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-500 dark:text-yellow-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-300 transition-colors" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
