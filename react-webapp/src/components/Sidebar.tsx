import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Settings, LogOut, X, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../utils/cn";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  {
    name: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    name: "users",
    href: "/users",
    icon: Users,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    name: "settings",
    href: "/settings",
    icon: Settings,
    color: "text-purple-600 dark:text-purple-400",
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { signOut } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 z-30 w-72 h-full glassmorphism border-r border-gray-200/20 dark:border-gray-500/20 transform transition-all duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-purple-500/5 to-emerald-500/5"></div>

          {/* Sidebar header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/20 dark:border-gray-500/20 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 shadow-lg animate-pulse-slow">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                {t("navigation.workspace")}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl glassmorphism hover:shadow-lg transition-all duration-300 group hover:bg-red-50 dark:hover:bg-red-900/20"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-2 relative z-10">
            {navigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium group border nav-link-smooth",
                    isActive
                      ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-gray-900 dark:text-gray-100 shadow-lg border-indigo-200/60 dark:border-indigo-600/40"
                      : "border-transparent hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 text-gray-700 dark:text-gray-300 hover:border-blue-200/20 dark:hover:border-blue-600/20"
                  )
                }
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    item.color,
                    "group-hover:scale-110"
                  )}
                />
                <span className="group-hover:text-gray-900 dark:group-hover:text-gray-100">
                  {t(`navigation.${item.name}`)}
                </span>
              </NavLink>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-200/20 dark:border-gray-500/20 relative z-10">
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 w-full group"
            >
              <LogOut className="mr-3 h-5 w-5 text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 group-hover:scale-110 transition-all duration-200" />
              {t("navigation.logout")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
