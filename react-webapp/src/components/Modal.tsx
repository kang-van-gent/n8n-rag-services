import React from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200/30 dark:border-gray-500/20 ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/30 dark:border-gray-500/20">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: "success" | "error" | "info";
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
}) => {
  const iconColors = {
    success: "text-green-600",
    error: "text-red-600",
    info: "text-blue-600",
  };

  const bgColors = {
    success: "bg-green-100 dark:bg-green-900/30",
    error: "bg-red-100 dark:bg-red-900/30",
    info: "bg-blue-100 dark:bg-blue-900/30",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="text-center">
        <div
          className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${bgColors[type]} mb-4`}
        >
          {type === "success" && (
            <CheckCircle className={`w-6 h-6 ${iconColors[type]}`} />
          )}
          {type === "error" && (
            <AlertCircle className={`w-6 h-6 ${iconColors[type]}`} />
          )}
          {type === "info" && (
            <AlertCircle className={`w-6 h-6 ${iconColors[type]}`} />
          )}
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          OK
        </button>
      </div>
    </Modal>
  );
};
