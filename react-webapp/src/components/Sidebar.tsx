import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Settings, LogOut, X, Zap } from "lucide-react";
import { cn } from "../utils/cn";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
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
          <div className="absolute inset-0 bg-gradient-to-b from-gray-500/5 via-transparent to-gray-400/5"></div>

          {/* Sidebar header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/20 dark:border-gray-500/20 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-gray-800 to-black shadow-bw animate-pulse-slow">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-black dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                Workspace
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl glassmorphism hover:shadow-bw transition-all duration-300 group"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors" />
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
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-gradient-to-r from-gray-800/20 to-black/20 text-gray-900 dark:text-gray-100 shadow-bw"
                      : "hover:bg-gray-500/10 text-gray-700 dark:text-gray-300"
                  )
                }
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    "group-hover:text-gray-900 dark:group-hover:text-gray-100"
                  )}
                />
                <span className="group-hover:text-gray-900 dark:group-hover:text-gray-100">
                  {item.name}
                </span>
              </NavLink>
            ))}
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-gray-200/20 dark:border-gray-500/20 relative z-10">
            <button className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-500/10 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200 w-full group">
              <LogOut className="mr-3 h-5 w-5 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
