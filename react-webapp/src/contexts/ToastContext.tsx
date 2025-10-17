import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "../utils/cn";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast = { ...toast, id };

      setToasts((prev) => [...prev, newToast]);

      // Auto remove toast after duration
      const duration = toast.duration || 5000;
      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string, duration?: number) => {
      addToast({ type: "success", title, message, duration });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string, duration?: number) => {
      addToast({ type: "error", title, message, duration });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string, duration?: number) => {
      addToast({ type: "info", title, message, duration });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string, duration?: number) => {
      addToast({ type: "warning", title, message, duration });
    },
    [addToast]
  );

  const value = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case "success":
        return "border-green-200 dark:border-green-800";
      case "error":
        return "border-red-200 dark:border-red-800";
      case "warning":
        return "border-yellow-200 dark:border-yellow-800";
      case "info":
        return "border-blue-200 dark:border-blue-800";
      default:
        return "border-gray-200 dark:border-gray-800";
    }
  };

  const getBackgroundColor = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-50 dark:bg-green-900/20";
      case "error":
        return "bg-red-50 dark:bg-red-900/20";
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-900/20";
      case "info":
        return "bg-blue-50 dark:bg-blue-900/20";
      default:
        return "bg-white dark:bg-gray-800";
    }
  };

  return (
    <div
      className={cn(
        "max-w-sm w-full glassmorphism rounded-xl shadow-lg border p-4 transform transition-all duration-300 ease-in-out",
        "animate-in slide-in-from-right-full",
        getBorderColor(),
        getBackgroundColor()
      )}
      role="alert"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {toast.message}
            </p>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
    </div>
  );
}
