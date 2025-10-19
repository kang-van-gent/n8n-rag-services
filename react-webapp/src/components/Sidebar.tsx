import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  LogOut,
  X,
  Zap,
  Brain,
  ShoppingCart,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
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
    name: "ragSettings",
    href: "/rag-settings",
    icon: Brain,
    color: "text-orange-600 dark:text-orange-400",
  },
  {
    name: "users",
    href: "/users",
    icon: Users,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    name: "cart",
    href: "/cart",
    icon: ShoppingCart,
    color: "text-purple-600 dark:text-purple-400",
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { items } = useCart();

  const cartItemsCount = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      {/* Mobile overlay with improved light mode */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 dark:bg-black/50 z-20 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Always visible on desktop, toggleable on mobile */}
      <div
        className={cn(
          "fixed top-0 left-0 z-30 h-full border-r border-gray-200/30 dark:border-gray-500/20 transition-all duration-300 ease-out transform",
          "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-xl",
          isOpen ? "w-72" : "w-20 lg:block hidden",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full relative overflow-hidden">
          {/* Improved background gradient for light mode */}
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 via-blue-50/30 to-purple-50/30 dark:from-indigo-500/5 dark:via-purple-500/5 dark:to-emerald-500/5"></div>

          {/* Sidebar header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/30 dark:border-gray-500/20 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 shadow-lg animate-pulse-slow">
                <Zap className="w-6 h-6 text-white" />
              </div>
              {isOpen && (
                <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                  {t("navigation.workspace")}
                </h2>
              )}
            </div>
            {isOpen && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl glassmorphism hover:shadow-lg transition-all duration-300 group hover:bg-red-50 dark:hover:bg-red-900/20"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5 text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-2 relative z-10">
            {navigation.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-xl font-medium group border nav-link-smooth transition-all duration-200",
                    isOpen ? "px-4 py-3" : "px-3 py-3 justify-center",
                    isActive
                      ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-gray-900 dark:text-gray-100 shadow-lg border-indigo-300/60 dark:border-indigo-600/40"
                      : "border-transparent hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 text-gray-700 dark:text-gray-300 hover:border-blue-300/30 dark:hover:border-blue-600/20 hover:shadow-sm"
                  )
                }
                title={!isOpen ? t(`navigation.${item.name}`) : undefined}
              >
                <div className="relative">
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-all duration-200",
                      item.color,
                      "group-hover:scale-110",
                      !isOpen && "flex-shrink-0"
                    )}
                  />
                  {item.name === "cart" && cartItemsCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {cartItemsCount}
                    </span>
                  )}
                </div>
                {isOpen && (
                  <span className="group-hover:text-gray-900 dark:group-hover:text-gray-100 whitespace-nowrap">
                    {t(`navigation.${item.name}`)}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-200/30 dark:border-gray-500/20 relative z-10">
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center text-sm font-medium text-red-600 dark:text-red-400 rounded-xl hover:bg-gradient-to-r hover:from-red-100 hover:to-pink-100 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 w-full group hover:shadow-sm",
                isOpen ? "px-4 py-3" : "px-3 py-3 justify-center"
              )}
              title={!isOpen ? t("navigation.logout") : undefined}
            >
              <LogOut
                className={cn(
                  "h-5 w-5 text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300 group-hover:scale-110 transition-all duration-200",
                  isOpen ? "mr-3" : "flex-shrink-0"
                )}
              />
              {isOpen && t("navigation.logout")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
