import React, { useState, useEffect } from "react";
import {
  Crown,
  CreditCard,
  Mail,
  Phone,
  Package,
  Edit,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Save,
  X,
  RefreshCw,
  DollarSign,
  History,
  TrendingUp,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { useToken } from "../contexts/TokenContext";
import { useCart } from "../contexts/CartContext";
import { TokenFeatureService } from "../services/TokenFeatureService";
import { PricingService } from "../services/pricingService";
import { TokenGenerationService } from "../services/tokenGenerationService";
import {
  SubscriptionService,
  SubscriptionHistory,
  SubscriptionSummary,
} from "../services/subscriptionService";
import { PaymentService, PaymentOrder } from "../services/paymentService";
import { OmisePaymentService } from "../services/OmisePaymentService";
import { OrderService } from "../services/orderService";
import BillingManagement from "../components/BillingManagement";
import { AlertModal } from "../components/Modal";
import { cn } from "../utils/cn";
import { supabase } from "../lib/supabase";

// Define BillingSettings interface locally to avoid import issues
interface BillingSettings {
  id?: string;
  user_id: string;
  auto_renewal_enabled: boolean;
  billing_cycle: "monthly" | "yearly";
  currency: string;
  timezone: string;
  notification_preferences: {
    email: boolean;
    sms: boolean;
  };
  created_at?: string;
  updated_at?: string;
}

// Self-contained billing service to avoid module resolution issues
const BillingSettingsService = {
  // Get default billing settings when database is not available
  getDefaultBillingSettings(userId: string): BillingSettings {
    return {
      user_id: userId,
      auto_renewal_enabled: false,
      billing_cycle: "monthly",
      currency: "THB",
      timezone: "Asia/Bangkok",
      notification_preferences: {
        email: true,
        sms: false,
      },
    };
  },

  async getBillingSettings(userId: string): Promise<BillingSettings | null> {
    try {
      // Don't use .single() since there might be no records yet
      const { data, error } = await supabase
        .from("user_billing_settings")
        .select("*")
        .eq("user_id", userId)
        .limit(1);

      if (error) {
        // Handle various database errors
        console.warn(
          "Database error fetching billing settings, using defaults:",
          error
        );
        return this.getDefaultBillingSettings(userId);
      }

      // If no data found, return default settings
      if (!data || data.length === 0) {
        console.log("No billing settings found for user, using defaults");
        return this.getDefaultBillingSettings(userId);
      }

      // Return the first (and should be only) record
      return data[0];
    } catch (error) {
      console.error("Error fetching billing settings:", error);
      // Return default settings if database error
      return this.getDefaultBillingSettings(userId);
    }
  },

  async toggleAutoRenewal(userId: string, enabled: boolean): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("user_billing_settings")
        .upsert({
          user_id: userId,
          auto_renewal_enabled: enabled,
        })
        .select()
        .single();

      if (error) {
        // Handle various database errors
        if (
          error.code === "PGRST205" ||
          error.code === "PGRST116" ||
          error.message?.includes("406") ||
          error.message?.includes("Not Acceptable")
        ) {
          console.warn(
            "Billing settings table not found or not accessible, returning mock state. Please run the billing schema migration.",
            error
          );
          return enabled;
        }
        // For other errors, still return the desired state but log the error
        console.error("Database error, returning mock state:", error);
        return enabled;
      }

      return data.auto_renewal_enabled;
    } catch (error) {
      console.error("Error toggling auto-renewal:", error);
      // Return the desired state if database error
      return enabled;
    }
  },
};

export function Users() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { token, loading: tokenLoading } = useToken();
  const { items, itemCount } = useCart();
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [subscriptionHistory, setSubscriptionHistory] = useState<
    SubscriptionHistory[]
  >([]);
  const [subscriptionSummary, setSubscriptionSummary] =
    useState<SubscriptionSummary | null>(null);
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [generalOrders, setGeneralOrders] = useState<any[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [showBillingManagement, setShowBillingManagement] = useState(false);
  const [processingRenewal, setProcessingRenewal] = useState(false);
  const [showRenewalDetails, setShowRenewalDetails] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [renewalPricing, setRenewalPricing] = useState<any>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "success" | "error" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });
  const [billingSettings, setBillingSettings] =
    useState<BillingSettings | null>(null);
  const [loadingBillingSettings, setLoadingBillingSettings] = useState(false);

  useEffect(() => {
    if (user) {
      setUserProfile({
        firstName: user.user_metadata?.first_name || "",
        lastName: user.user_metadata?.last_name || "",
        email: user.email || "",
        phone: user.user_metadata?.phone || "",
      });

      // Load subscription data
      loadSubscriptionData(user.id);
      // Load billing settings
      loadBillingSettings(user.id);
    }
  }, [user]);

  const loadSubscriptionData = async (userId: string) => {
    setLoadingSubscriptions(true);
    try {
      const [history, summary, paymentOrders, generalOrders] =
        await Promise.all([
          SubscriptionService.getSubscriptionHistory(userId, 5),
          SubscriptionService.getSubscriptionSummary(userId),
          PaymentService.getUserOrders(userId),
          OrderService.getUserOrders(userId),
        ]);
      setSubscriptionHistory(history);
      setSubscriptionSummary(summary);
      setPaymentOrders(paymentOrders);

      // Store general orders in a new state (we'll add this)
      setGeneralOrders(generalOrders);

      // Load pricing information after orders are loaded (combine both order types)
      if (token) {
        loadRenewalPricing(token, [...paymentOrders, ...generalOrders]);
      }
    } catch (error) {
      console.error("Error loading subscription data:", error);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const loadRenewalPricing = async (tokenData: any, orders: any[] = []) => {
    setLoadingPricing(true);
    try {
      const pricing = await PricingService.calculateRenewalPrice(
        tokenData,
        orders
      );
      setRenewalPricing(pricing);
    } catch (error) {
      console.error("Error loading renewal pricing:", error);
    } finally {
      setLoadingPricing(false);
    }
  };

  const loadBillingSettings = async (userId: string) => {
    setLoadingBillingSettings(true);
    try {
      const settings = await BillingSettingsService.getBillingSettings(userId);
      setBillingSettings(settings);
    } catch (error) {
      console.error("Error loading billing settings:", error);
    } finally {
      setLoadingBillingSettings(false);
    }
  };

  const handleToggleAutoRenewal = async () => {
    if (!user || loadingBillingSettings) return;

    setLoadingBillingSettings(true);
    try {
      const newValue = !billingSettings?.auto_renewal_enabled;
      const updatedEnabled = await BillingSettingsService.toggleAutoRenewal(
        user.id,
        newValue
      );

      setBillingSettings((prev: BillingSettings | null) =>
        prev
          ? {
              ...prev,
              auto_renewal_enabled: updatedEnabled,
            }
          : {
              user_id: user.id,
              auto_renewal_enabled: updatedEnabled,
              billing_cycle: "monthly",
              currency: "THB",
              timezone: "Asia/Bangkok",
              notification_preferences: { email: true, sms: false },
            }
      );
    } catch (error) {
      console.error("Error toggling auto-renewal:", error);
    } finally {
      setLoadingBillingSettings(false);
    }
  };

  const handleRenewToken = async () => {
    if (!user?.id || !token) return;

    setProcessingRenewal(true);
    try {
      // Use the current renewal pricing from state
      if (!renewalPricing) {
        showAlertModal(
          "Pricing Error",
          "Unable to calculate renewal pricing. Please refresh the page.",
          "error"
        );
        return;
      }

      // Get user's payment methods
      const paymentMethods = await OmisePaymentService.getUserPaymentMethods(
        user.id
      );

      if (paymentMethods.length === 0) {
        showAlertModal(
          "Payment Method Required",
          "Please add a payment method first by going to Cart and setting up payment.",
          "error"
        );
        return;
      }

      // Use the first (default) payment method
      const defaultPaymentMethod =
        paymentMethods.find((pm) => pm.is_default) || paymentMethods[0];

      // Process renewal payment
      const result = await OmisePaymentService.processPayment(
        user.id,
        renewalPricing.totalPrice,
        renewalPricing.currency,
        `Token renewal for ${token.package} plan with add-ons`,
        defaultPaymentMethod.id
      );

      if (result.success) {
        // Renew the token using the new service
        await TokenGenerationService.renewToken(user.id, token);

        showAlertModal(
          "Renewal Successful",
          `Token renewed successfully! Paid ${PricingService.formatCurrency(
            renewalPricing.totalPrice,
            renewalPricing.currency
          )}`,
          "success"
        );

        // Refresh the data
        await loadSubscriptionData(user.id);
      } else {
        showAlertModal(
          "Payment Failed",
          `Payment failed: ${result.error}`,
          "error"
        );
      }
    } catch (error) {
      console.error("Renewal error:", error);
      showAlertModal(
        "Renewal Failed",
        "Renewal failed. Please try again.",
        "error"
      );
    } finally {
      setProcessingRenewal(false);
    }
  };

  const handleSaveProfile = async () => {
    // Here you would typically call an API to update the user profile
    console.log("Saving profile:", userProfile);
    setIsEditing(false);
    // You can add actual API call here when backend is ready
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number, currency: string = "THB") => {
    return PricingService.formatCurrency(amount, currency);
  };

  const showAlertModal = (
    title: string,
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type,
    });
  };

  const closeAlertModal = () => {
    setAlertModal((prev) => ({ ...prev, isOpen: false }));
  }; // Load pricing when token or paymentOrders change
  useEffect(() => {
    if (token && paymentOrders.length >= 0) {
      loadRenewalPricing(token, paymentOrders);
    }
  }, [token, paymentOrders]);

  // Helper function to download purchase receipt
  const downloadReceipt = (
    order: PaymentOrder,
    format: "json" | "txt" = "json"
  ) => {
    // Ensure order.items is an array
    const orderItems = Array.isArray(order.items) ? order.items : [];

    const receiptData = {
      orderId: order.id,
      purchaseDate: formatDate(order.created_at),
      completedDate: order.completed_at ? formatDate(order.completed_at) : null,
      customerInfo: {
        id: user?.id,
        email: user?.email,
        name:
          `${userProfile.firstName} ${userProfile.lastName}`.trim() || "N/A",
      },
      items: orderItems.map((item) => ({
        name: item.feature?.name || "Unknown Item",
        description: item.feature?.description || "",
        category: item.feature?.category || "",
        price: item.price || 0,
        quantity: item.quantity || 1,
        total: (item.price || 0) * (item.quantity || 1),
      })),
      totalAmount: order.total_amount,
      currency: order.currency,
      paymentMethod: order.payment_method,
      status: order.status,
    };

    if (format === "json") {
      const blob = new Blob([JSON.stringify(receiptData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${order.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const receiptText = `
PURCHASE RECEIPT
================
Order ID: ${receiptData.orderId}
Purchase Date: ${receiptData.purchaseDate}
${
  receiptData.completedDate
    ? `Completed Date: ${receiptData.completedDate}`
    : ""
}

Customer Information:
- Email: ${receiptData.customerInfo.email}
- Name: ${receiptData.customerInfo.name}

Items Purchased:
${receiptData.items
  .map(
    (item) =>
      `- ${item.name} x${item.quantity} @ ฿${item.price} = ฿${item.total}`
  )
  .join("\n")}

Total Amount: ฿${receiptData.totalAmount}
Currency: ${receiptData.currency}
Payment Method: ${receiptData.paymentMethod}
Status: ${receiptData.status.toUpperCase()}

Generated on: ${new Date().toLocaleString()}
      `.trim();

      const blob = new Blob([receiptText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${order.id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const getIncludedFeatures = () => {
    if (!token) return [];
    return TokenFeatureService.getIncludedFeatures(token);
  };

  if (!user) {
    return (
      <Layout title="Profile">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {t("users.notLoggedIn")}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t("users.pleaseLogIn")}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t("users.myProfile")}>
      <div className="space-y-8">
        {/* Profile Header */}
        <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg sm:text-2xl font-bold mx-auto sm:mx-0">
                {userProfile.firstName.charAt(0) ||
                  user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {userProfile.firstName && userProfile.lastName
                    ? `${userProfile.firstName} ${userProfile.lastName}`
                    : "User Profile"}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                  {userProfile.email}
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                  {token ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <Crown className="w-3 h-3" />
                      {token.package.charAt(0).toUpperCase() +
                        token.package.slice(1)}{" "}
                      Plan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                      <AlertCircle className="w-3 h-3" />
                      No Active Plan
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base w-full sm:w-auto shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
                isEditing
                  ? "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white border border-gray-400"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border border-blue-400"
              )}
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" />
                  {t("users.cancel")}
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  {t("users.editProfile")}
                </>
              )}
            </button>
          </div>

          {/* Profile Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("users.firstName")}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={userProfile.firstName}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100">
                  {userProfile.firstName || t("users.notSet")}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("users.lastName")}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={userProfile.lastName}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100">
                  {userProfile.lastName || t("users.notSet")}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("users.email")}
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  {userProfile.email}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("users.phone")}
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={userProfile.phone}
                  onChange={(e) =>
                    setUserProfile((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              ) : (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    {userProfile.phone || t("users.notSet")}
                  </div>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  {t("users.cancel")}
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {t("users.saveChanges")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Current Plan & Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Current Plan */}
          <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {t("users.currentPlan")}
              </h2>
            </div>

            {tokenLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-300">
                  {t("users.loading")}
                </span>
              </div>
            ) : token ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200/50 dark:border-emerald-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                        {token.package.charAt(0).toUpperCase() +
                          token.package.slice(1)}{" "}
                        {t("users.plan")}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {t("users.activePlan")}
                    </span>
                  </div>
                  <div className="text-sm text-emerald-800 dark:text-emerald-200">
                    {t("users.expires")}:{" "}
                    {token.expiredAt
                      ? formatDate(token.expiredAt)
                      : t("users.never")}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    {t("users.includedFeatures")} (
                    {getIncludedFeatures().length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getIncludedFeatures().map((feature, index) => (
                      <div
                        key={feature.featureKey}
                        className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {feature.displayName || feature.featureKey}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {t("users.quantity")}:{" "}
                            {feature.featureKey?.includes("chat")
                              ? 1
                              : feature.quantity}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t("users.noActivePlan")}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {t("users.activateFeatures")}
                </p>
                <button className="btn-aura px-4 py-2 text-sm font-semibold rounded-lg">
                  {t("users.choosePlan")}
                </button>
              </div>
            )}
          </div>

          {/* Shopping Cart Summary */}
          <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
            <div className="flex items-center gap-3 mb-6">
              <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {t("users.shoppingCart")}
              </h2>
              {itemCount > 0 && (
                <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-medium px-2 py-1 rounded-full">
                  {itemCount}{" "}
                  {itemCount !== 1 ? t("cart.items") : t("cart.item")}
                </span>
              )}
            </div>

            {items.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-500/20"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {item.feature.name}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {t("users.quantity")}: {item.quantity} × ฿{item.price}
                          /{item.period}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                        ฿{item.price * item.quantity}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-purple-200 dark:border-purple-500/30">
                  <div className="flex items-center justify-between text-base font-semibold text-gray-900 dark:text-gray-100">
                    <span>{t("users.total")}:</span>
                    <span>
                      ฿
                      {items.reduce(
                        (total, item) => total + item.price * item.quantity,
                        0
                      )}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/cart")}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors text-sm sm:text-base"
                >
                  {t("users.viewCartCheckout")}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {t("users.cartEmpty")}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t("users.cartEmptyDescription")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Subscription Details */}
        <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t("users.subscription")}
            </h2>
          </div>

          {token ? (
            <div className="space-y-4">
              {/* Current Plan Info */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200/50 dark:border-indigo-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-semibold text-indigo-900 dark:text-indigo-100">
                      {token.package.charAt(0).toUpperCase() +
                        token.package.slice(1)}{" "}
                      {t("users.plan")}
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                    {t("users.activePlan")}
                  </span>
                </div>
                <div className="text-sm text-indigo-800 dark:text-indigo-200">
                  {t("users.billingCycle")}: {t("users.monthly")}
                </div>
              </div>

              {/* Billing Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {t("users.nextBilling")}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {token.expiredAt
                        ? formatDate(token.expiredAt)
                        : t("users.never")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {t("users.autoRenewal")}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {billingSettings?.auto_renewal_enabled
                          ? t("users.enabled")
                          : t("users.disabled")}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleAutoRenewal}
                    disabled={loadingBillingSettings}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                      billingSettings?.auto_renewal_enabled
                        ? "bg-blue-600"
                        : "bg-gray-300 dark:bg-gray-600"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200",
                        billingSettings?.auto_renewal_enabled
                          ? "translate-x-6"
                          : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Subscription Summary */}
              {subscriptionSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {subscriptionSummary.total_subscriptions}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t("users.totalSubscriptions")}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {SubscriptionService.formatCurrency(
                        subscriptionSummary.total_spent
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t("users.totalSpent")}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {subscriptionSummary.current_streak_months}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t("users.streakMonths")}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {subscriptionSummary.first_subscription_date
                        ? new Date(
                            subscriptionSummary.first_subscription_date
                          ).getFullYear()
                        : "-"}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t("users.memberSince")}
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase History (Subscriptions & Add-ons) */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      Purchase History
                    </h3>
                  </div>
                  {(subscriptionHistory.length > 0 ||
                    paymentOrders.length > 0 ||
                    generalOrders.length > 0) && (
                    <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 text-sm font-medium">
                      {t("users.viewAll")}
                    </button>
                  )}
                </div>

                {loadingSubscriptions ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full"></div>
                  </div>
                ) : subscriptionHistory.length > 0 ||
                  paymentOrders.length > 0 ||
                  generalOrders.length > 0 ? (
                  <div className="space-y-3">
                    {/* Subscription History */}
                    {subscriptionHistory.map((subscription) => {
                      const statusDisplay =
                        SubscriptionService.getStatusDisplay(
                          subscription.status
                        );
                      return (
                        <div
                          key={`subscription-${subscription.id}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                              <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                {SubscriptionService.getPlanDisplayName(
                                  subscription.plan_type
                                )}{" "}
                                Subscription
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {formatDate(subscription.started_at)} -{" "}
                                {subscription.expires_at
                                  ? formatDate(subscription.expires_at)
                                  : t("users.ongoing")}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                {SubscriptionService.formatCurrency(
                                  subscription.amount
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                /
                                {subscription.billing_cycle === "monthly"
                                  ? t("users.month")
                                  : t("users.year")}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.bgColor} ${statusDisplay.color}`}
                            >
                              {statusDisplay.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Payment Orders (Add-ons) */}
                    {paymentOrders
                      .filter((order) => order.status === "completed")
                      .map((order) => {
                        const isExpanded = expandedOrders.has(order.id);
                        return (
                          <div
                            key={`order-${order.id}`}
                            className="rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden"
                          >
                            {/* Main Order Info */}
                            <div className="flex items-center justify-between p-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                  <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                    Add-on Purchase (
                                    {Array.isArray(order.items)
                                      ? order.items.length
                                      : 0}{" "}
                                    item
                                    {Array.isArray(order.items) &&
                                    order.items.length > 1
                                      ? "s"
                                      : ""}
                                    )
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {formatDate(order.created_at)} • Order #
                                    {order.id.slice(0, 8)}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {Array.isArray(order.items) &&
                                    order.items.length > 0
                                      ? order.items
                                          .map(
                                            (item) =>
                                              item.feature?.name ||
                                              "Unknown Item"
                                          )
                                          .join(", ")
                                      : "No items"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                    {formatCurrency(
                                      order.total_amount,
                                      order.currency
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    one-time
                                  </div>
                                </div>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                  Purchased
                                </span>

                                {/* Action Buttons */}
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => toggleOrderDetails(order.id)}
                                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                                    title={
                                      isExpanded
                                        ? "Hide Details"
                                        : "View Details"
                                    }
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() =>
                                      downloadReceipt(order, "json")
                                    }
                                    className="p-1.5 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                    title="Download JSON Receipt"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      downloadReceipt(order, "txt")
                                    }
                                    className="p-1.5 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-200 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                    title="Download Text Receipt"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-4">
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">
                                        Order ID:
                                      </span>
                                      <div className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded mt-1">
                                        {order.id}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">
                                        Payment Method:
                                      </span>
                                      <div className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                                        {order.payment_method}
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                                      Items Purchased:
                                    </span>
                                    <div className="mt-2 space-y-2">
                                      {Array.isArray(order.items) &&
                                      order.items.length > 0 ? (
                                        order.items.map((item, idx) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between items-start p-2 bg-white dark:bg-gray-700 rounded border"
                                          >
                                            <div className="flex-1">
                                              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                                {item.feature?.name ||
                                                  "Unknown Item"}
                                              </div>
                                              {item.feature?.description && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                  {item.feature.description}
                                                </div>
                                              )}
                                              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                                Category:{" "}
                                                {item.feature?.category ||
                                                  "N/A"}
                                              </div>
                                            </div>
                                            <div className="text-right ml-3">
                                              <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                                {formatCurrency(
                                                  (item.price || 0) *
                                                    (item.quantity || 1),
                                                  order.currency
                                                )}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {formatCurrency(
                                                  item.price || 0,
                                                  order.currency
                                                )}{" "}
                                                × {item.quantity || 1}
                                              </div>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-gray-500 dark:text-gray-400 text-sm">
                                          No items found
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      Total:
                                    </span>
                                    <span className="font-bold text-lg text-purple-600 dark:text-purple-400">
                                      {formatCurrency(
                                        order.total_amount,
                                        order.currency
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                    {/* General Orders */}
                    {generalOrders
                      .filter(
                        (order) =>
                          order.status === "completed" ||
                          order.status === "delivered"
                      )
                      .map((order) => {
                        const isExpanded = expandedOrders.has(order.id);
                        return (
                          <div
                            key={`general-order-${order.id}`}
                            className="rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden"
                          >
                            {/* Main Order Info */}
                            <div className="flex items-center justify-between p-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                  <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                    Order #{order.order_number} (
                                    {Array.isArray(order.order_items)
                                      ? order.order_items.length
                                      : 0}{" "}
                                    item
                                    {Array.isArray(order.order_items) &&
                                    order.order_items.length > 1
                                      ? "s"
                                      : ""}
                                    )
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {formatDate(order.created_at)} • Status:{" "}
                                    {order.status}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Customer: {order.customer_name}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                    {formatCurrency(
                                      order.total_amount,
                                      order.currency
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {order.status === "delivered"
                                      ? "delivered"
                                      : "completed"}
                                  </div>
                                </div>
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                  Order
                                </span>

                                {/* Action Buttons */}
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      const newExpanded = new Set(
                                        expandedOrders
                                      );
                                      if (isExpanded) {
                                        newExpanded.delete(order.id);
                                      } else {
                                        newExpanded.add(order.id);
                                      }
                                      setExpandedOrders(newExpanded);
                                    }}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                  >
                                    <ChevronDown
                                      className={`w-4 h-4 transition-transform ${
                                        isExpanded ? "rotate-180" : ""
                                      }`}
                                    />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs">
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Customer Email:
                                    </span>
                                    <div className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                                      {order.customer_email}
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                                      Items Ordered:
                                    </span>
                                    <div className="mt-2 space-y-2">
                                      {Array.isArray(order.order_items) &&
                                      order.order_items.length > 0 ? (
                                        order.order_items.map(
                                          (item: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className="flex justify-between items-start p-2 bg-white dark:bg-gray-700 rounded border"
                                            >
                                              <div className="flex-1">
                                                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                                  {item.product_name ||
                                                    "Unknown Item"}
                                                </div>
                                                {item.product_description && (
                                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    {item.product_description}
                                                  </div>
                                                )}
                                                {item.product_category && (
                                                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                    Category:{" "}
                                                    {item.product_category}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="text-right ml-3">
                                                <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                                  {formatCurrency(
                                                    item.line_total ||
                                                      item.unit_price *
                                                        item.quantity,
                                                    order.currency
                                                  )}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  {formatCurrency(
                                                    item.unit_price || 0,
                                                    order.currency
                                                  )}{" "}
                                                  × {item.quantity || 1}
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        )
                                      ) : (
                                        <div className="text-gray-500 dark:text-gray-400 text-sm">
                                          No items found
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      Total:
                                    </span>
                                    <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                                      {formatCurrency(
                                        order.total_amount,
                                        order.currency
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      No purchase history available
                    </p>
                  </div>
                )}
              </div>

              {/* Renewal Pricing Info */}
              {renewalPricing && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      Renewal Pricing
                    </h4>
                    <button
                      onClick={() => setShowRenewalDetails(!showRenewalDetails)}
                      className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 text-sm"
                    >
                      {showRenewalDetails ? "Hide Details" : "View Details"}
                    </button>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-300 text-sm">
                        Total Monthly Cost:
                      </span>
                      <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(renewalPricing.totalPrice)}
                      </span>
                    </div>
                    {renewalPricing.addOnPrice > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Base: {formatCurrency(renewalPricing.basePrice)} +
                        Add-ons: {formatCurrency(renewalPricing.addOnPrice)}
                      </div>
                    )}
                  </div>

                  {showRenewalDetails && (
                    <div className="space-y-2 mb-4">
                      {renewalPricing.breakdown.map(
                        (item: any, index: number) => (
                          <div
                            key={index}
                            className="flex justify-between items-center text-sm py-1"
                          >
                            <span className="text-gray-600 dark:text-gray-300">
                              {item.name}
                              <span
                                className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                                  item.type === "plan"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                }`}
                              >
                                {item.type === "plan" ? "Plan" : "Add-on"}
                              </span>
                            </span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {formatCurrency(item.price)}/{item.period}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Plan Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm">
                  {t("users.upgradePlan")}
                </button>
                <button
                  onClick={() => setShowBillingManagement(true)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors text-sm"
                >
                  {t("users.manageBilling")}
                </button>

                {/* Renewal Button */}
                {token && renewalPricing && (
                  <button
                    onClick={handleRenewToken}
                    disabled={processingRenewal}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {processingRenewal ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Renew Now (
                        {formatCurrency(
                          renewalPricing.totalPrice,
                          renewalPricing.currency
                        )}
                        )
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t("users.noSubscription")}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t("users.subscribeMessage")}
              </p>
              <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
                {t("users.choosePlan")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Billing Management Modal */}
      {showBillingManagement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-auto animate-in slide-in-from-bottom-4 duration-300">
            <BillingManagement
              customerId={user?.id}
              onClose={() => setShowBillingManagement(false)}
            />
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlertModal}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </Layout>
  );
}
