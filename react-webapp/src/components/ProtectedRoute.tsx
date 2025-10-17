import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-100 to-gray-200 dark:from-black dark:via-gray-800 dark:to-gray-900">
        <div className="glassmorphism p-8 rounded-2xl border border-gray-200/20 dark:border-gray-500/20">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            <span className="text-gray-700 dark:text-gray-300">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to sign-in page with return url
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-100 to-gray-200 dark:from-black dark:via-gray-800 dark:to-gray-900">
        <div className="glassmorphism p-8 rounded-2xl border border-gray-200/20 dark:border-gray-500/20">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            <span className="text-gray-700 dark:text-gray-300">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    // Redirect to dashboard if already authenticated
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
