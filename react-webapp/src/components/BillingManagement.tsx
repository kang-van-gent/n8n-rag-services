import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  Trash2,
  Star,
  AlertCircle,
  CheckCircle,
  Calendar,
  DollarSign,
  Settings,
  X,
  Edit3,
  Shield,
  Clock,
  Download,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { OmisePaymentService, OmisePaymentMethod } from "../services";
import OmisePaymentForm from "./OmisePaymentForm";
import { cn } from "../utils/cn";

interface BillingManagementProps {
  customerId?: string;
  onClose?: () => void;
  className?: string;
  token?: any;
  billingSettings?: any;
}

export function BillingManagement({
  customerId,
  onClose,
  className,
  token,
  billingSettings,
}: BillingManagementProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<OmisePaymentMethod[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "methods">(
    "overview"
  );

  // Initialize Omise when component mounts
  useEffect(() => {
    OmisePaymentService.initialize();
  }, []);

  useEffect(() => {
    loadBillingData();
  }, [user?.id]);

  const loadBillingData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const methods = await OmisePaymentService.getUserPaymentMethods(user.id);
      setPaymentMethods(methods);
    } catch (error) {
      console.error("Failed to load payment methods:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async (paymentMethod: OmisePaymentMethod) => {
    // Add the new payment method to the state
    setPaymentMethods((prev) => [...prev, paymentMethod]);
    setShowAddCard(false);
  };
  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (window.confirm(t("billing.confirmDeleteCard"))) {
      try {
        if (user?.id) {
          // Remove from local state (service method would be implemented here)
          setPaymentMethods((prev) =>
            prev.filter((pm) => pm.id !== paymentMethodId)
          );
        }
      } catch (error) {
        console.error("Error deleting payment method:", error);
      }
    }
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      if (user?.id) {
        // Update local state (service method would be implemented here)
        setPaymentMethods((prev) =>
          prev.map((pm) => ({ ...pm, is_default: pm.id === paymentMethodId }))
        );
      }
    } catch (error) {
      console.error("Error setting default payment method:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getBillingStatus = () => {
    if (!token?.expiredAt) {
      return { status: "No active subscription", color: "red" };
    }

    try {
      const expiredAt = new Date(token.expiredAt);
      const now = new Date();

      if (expiredAt <= now) {
        return { status: "Expired", color: "red" };
      }

      return { status: "Active", color: "green" };
    } catch (error) {
      return { status: "Unknown", color: "gray" };
    }
  };

  const getNextBillingDate = () => {
    if (!token?.expiredAt) {
      return "Not available";
    }

    if (!billingSettings?.auto_renewal_enabled) {
      return "Auto-renewal disabled";
    }

    try {
      const expiredAt = new Date(token.expiredAt);
      const now = new Date();

      // If token is already expired, show "Expired"
      if (expiredAt <= now) {
        return "Expired";
      }

      return formatDate(expiredAt.toISOString());
    } catch (error) {
      console.error("Error formatting billing date:", error);
      return "Not available";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              {t("billing.title")}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {t("billing.subtitle")}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors self-end sm:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 border-b border-gray-200 dark:border-gray-700">
        {[
          {
            id: "overview",
            label: t("billing.overview"),
            icon: DollarSign,
            shortLabel: "Overview",
          },
          {
            id: "methods",
            label: t("billing.paymentMethods"),
            icon: CreditCard,
            shortLabel: "Cards",
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden md:inline text-center">{tab.label}</span>
            <span className="md:hidden text-center leading-tight">
              {tab.shortLabel}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Account Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div
                className={`p-3 sm:p-4 rounded-lg border ${
                  getBillingStatus().color === "green"
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30"
                    : getBillingStatus().color === "red"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30"
                    : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-500/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  {getBillingStatus().color === "green" ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div
                      className={`font-semibold text-sm sm:text-base ${
                        getBillingStatus().color === "green"
                          ? "text-green-900 dark:text-green-100"
                          : "text-red-900 dark:text-red-100"
                      }`}
                    >
                      {t("billing.accountStatus")}
                    </div>
                    <div
                      className={`text-xs sm:text-sm ${
                        getBillingStatus().color === "green"
                          ? "text-green-700 dark:text-green-300"
                          : "text-red-700 dark:text-red-300"
                      }`}
                    >
                      {getBillingStatus().status}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-blue-900 dark:text-blue-100 text-sm sm:text-base">
                      {t("billing.paymentMethods")}
                    </div>
                    <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                      {paymentMethods.length} {t("billing.cards")}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/30">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-semibold text-purple-900 dark:text-purple-100 text-sm sm:text-base">
                      {t("billing.nextBilling")}
                    </div>
                    <div className="text-xs sm:text-sm text-purple-700 dark:text-purple-300">
                      {getNextBillingDate()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t("billing.quickActions")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowAddCard(true)}
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                    {t("billing.addPaymentMethod")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "methods" && (
          <div className="space-y-6">
            {/* Add Card Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("billing.paymentMethods")}
              </h3>
              <button
                onClick={() => setShowAddCard(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
              >
                <Plus className="w-4 h-4" />
                {t("billing.addCard")}
              </button>
            </div>

            {/* Payment Methods List */}
            <div className="space-y-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 gap-4"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-white dark:bg-gray-600 flex-shrink-0">
                      {method.type === "internet_banking" ? (
                        <div className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400">
                          🏦
                        </div>
                      ) : (
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                          {method.type === "internet_banking"
                            ? method.bank_name ||
                              `${method.brand} Mobile Banking`
                            : `${method.brand} •••• ${method.last_four_digits}`}
                        </span>
                        {method.is_default && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 w-fit">
                            <Star className="w-3 h-3" />
                            {t("billing.default")}
                          </span>
                        )}
                      </div>
                      {method.type !== "internet_banking" &&
                        method.expiry_month &&
                        method.expiry_year && (
                          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            {t("billing.expires")}{" "}
                            {method.expiry_month.toString().padStart(2, "0")}/
                            {method.expiry_year}
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end sm:justify-start">
                    {!method.is_default && (
                      <button
                        onClick={() => handleSetDefaultPaymentMethod(method.id)}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                      >
                        {t("billing.setDefault")}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePaymentMethod(method.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {paymentMethods.length === 0 && (
                <div className="text-center py-8">
                  <CreditCard className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t("billing.noPaymentMethods")}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                    {t("billing.addFirstCard")}
                  </p>
                  <button
                    onClick={() => setShowAddCard(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm sm:text-base"
                  >
                    {t("billing.addCard")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Payment Method Modal */}
      {showAddCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full max-h-[90vh] overflow-auto">
            <OmisePaymentForm
              userId={user?.id || ""}
              onSuccess={handleAddPaymentMethod}
              onCancel={() => setShowAddCard(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default BillingManagement;
