import React from "react";
import { Menu, Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { cn } from "../utils/cn";

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
}

export function Header({ onToggleSidebar, title = "Dashboard" }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="glassmorphism border-b border-gray-200/20 dark:border-gray-500/20 px-6 py-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-500/5 via-transparent to-gray-400/5"></div>
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2.5 rounded-xl glassmorphism hover:shadow-bw transition-all duration-300 group"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-gray-800 to-black animate-pulse-slow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-black dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl glassmorphism hover:shadow-bw transition-all duration-300 group"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5 text-gray-600 group-hover:text-gray-700 transition-colors" />
            ) : (
              <Sun className="w-5 h-5 text-gray-300 group-hover:text-gray-100 transition-colors" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
