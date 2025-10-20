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
  ArrowRight,
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
import { TokenService } from "../services/tokenService";
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
import { PaymentMethodSelection } from "../components/PaymentMethodSelection";
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

// Define unified purchase history interface
interface PurchaseHistoryItem {
  id: string;
  type: "order" | "subscription";
  date: string;
  title: string;
  orderNumber: string;
  items: Array<{
    name: string;
    description?: string;
    category?: string;
    price: number;
    quantity: number;
  }>;
  total: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  // Order specific
  orderId?: string;
  // Subscription specific
  planType?: string;
  planName?: string;
  features?: string[];
  nextExpiry?: string;
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
        return this.getDefaultBillingSettings(userId);
      }

      // If no data found, return default settings
      if (!data || data.length === 0) {
        return this.getDefaultBillingSettings(userId);
      }

      // Return the first (and should be only) record
      return data[0];
    } catch (error) {
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
          return enabled;
        }
        // For other errors, still return the desired state but log the error
        return enabled;
      }

      return data.auto_renewal_enabled;
    } catch (error) {
      // Return the desired state if database error
      return enabled;
    }
  },
};

export function Users() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { token, loading: tokenLoading, refreshToken } = useToken();
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
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>(
    []
  );
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<string | null>(
    null
  );
  const [processingUpgrade, setProcessingUpgrade] = useState(false);
  const [upgradeConfirmation, setUpgradeConfirmation] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [pendingUpgradeDetails, setPendingUpgradeDetails] = useState<any>(null);

  // Pagination state for Purchase History
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // Number of items to show per page

  // Payment method selection states
  const [showRenewalPayment, setShowRenewalPayment] = useState(false);
  const [showUpgradePayment, setShowUpgradePayment] = useState(false);
  const [pendingRenewalData, setPendingRenewalData] = useState<any>(null);
  const [pendingUpgradeData, setPendingUpgradeData] = useState<any>(null);

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
      // Load available plans
      loadPlans();

      // Handle payment returns from internet banking
      handlePaymentReturns();
    }
  }, [user]);

  // Shared function to handle subscription creation and token renewal for internet banking payments
  const completeInternetBankingSubscription = async (paymentData: {
    userId: string;
    amount: number;
    currency: string;
    description: string;
    chargeId?: string;
    orderId?: string;
    subscriptionContext?: {
      planName?: string;
      planType?: string;
      token?: any;
    };
  }) => {
    if (!user?.id || !paymentData.subscriptionContext) return;

    try {
      // Create subscription record
      const newExpiryDate = new Date();
      newExpiryDate.setMonth(newExpiryDate.getMonth() + 1); // Add 1 month

      const subscriptionRecord = await SubscriptionService.createSubscription({
        user_id: user.id,
        plan_name: paymentData.subscriptionContext.planName || "Basic Plan",
        plan_type: paymentData.subscriptionContext.planType as
          | "basic"
          | "standard"
          | "enterprise",
        status: "active",
        amount: paymentData.amount,
        currency: paymentData.currency,
        billing_cycle: "monthly",
        started_at: new Date().toISOString(),
        expires_at: newExpiryDate.toISOString(),
        cancelled_at: null,
        payment_method: "internet_banking",
        transaction_id: paymentData.chargeId || paymentData.orderId || null,
      });

      if (subscriptionRecord) {
        // Renew the token if token context is provided
        if (paymentData.subscriptionContext.token) {
          await TokenGenerationService.renewToken(
            user.id,
            paymentData.subscriptionContext.token
          );
        }

        // Refresh the data
        await loadSubscriptionData(user.id);

        showAlertModal(
          "Payment Successful",
          `Subscription renewed successfully! Paid ${PricingService.formatCurrency(
            paymentData.amount,
            paymentData.currency
          )}`,
          "success"
        );
      } else {
        showAlertModal(
          "Subscription Creation Failed",
          "Payment was successful but subscription record creation failed.",
          "error"
        );
      }
    } catch (error) {
      showAlertModal(
        "Subscription Processing Failed",
        "Payment was successful but subscription processing failed. Please contact support.",
        "error"
      );
    }
  };

  const handlePaymentReturns = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");

    if (paymentStatus === "success") {
      // Handle successful payment return
      const pendingRenewal = localStorage.getItem("pendingRenewal");
      const pendingUpgrade = localStorage.getItem("pendingUpgrade");
      const pendingPayment = localStorage.getItem(
        "pendingInternetBankingPayment"
      );

      if (pendingRenewal) {
        const renewalData = JSON.parse(pendingRenewal);
        localStorage.removeItem("pendingRenewal");
        setPendingRenewalData(renewalData);
        // Complete the renewal
        completeRenewal({
          chargeId: renewalData.chargeId,
          orderId: renewalData.orderId,
        });
      } else if (pendingUpgrade) {
        const upgradeData = JSON.parse(pendingUpgrade);
        localStorage.removeItem("pendingUpgrade");
        setPendingUpgradeData(upgradeData);
        // Complete the upgrade
        completeUpgrade({
          chargeId: upgradeData.chargeId,
          orderId: upgradeData.orderId,
        });
      } else if (pendingPayment) {
        // Handle general internet banking payment return
        const paymentData = JSON.parse(pendingPayment);
        localStorage.removeItem("pendingInternetBankingPayment");

        if (
          paymentData.isSubscriptionPayment &&
          paymentData.subscriptionContext
        ) {
          // Handle subscription payments (renewal/upgrade via internet banking)
          await completeInternetBankingSubscription(paymentData);
        } else {
          // Handle regular payment orders (add-ons, etc.)
          if (paymentData.orderId) {
            try {
              const { error } = await supabase
                .from("payment_orders")
                .update({
                  status: "completed",
                  completed_at: new Date().toISOString(),
                })
                .eq("id", paymentData.orderId);

              if (error) {
              } else {
                // Refresh subscription data to reflect the new payment
                await loadSubscriptionData(user?.id || "");

                showAlertModal(
                  "Payment Successful",
                  "Your internet banking payment has been completed successfully!",
                  "success"
                );
              }
            } catch (error) {
              showAlertModal(
                "Payment Status Unknown",
                "We couldn't confirm your payment status. Please check your account or contact support.",
                "error"
              );
            }
          }
        }
      }

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === "failed") {
      showAlertModal(
        "Payment Failed",
        "Internet banking payment was cancelled or failed. Please try again.",
        "error"
      );

      // Clean up any stored pending data and update orders to failed
      const pendingPayment = localStorage.getItem(
        "pendingInternetBankingPayment"
      );
      if (pendingPayment) {
        const paymentData = JSON.parse(pendingPayment);
        // Only update payment orders for non-subscription payments
        if (!paymentData.isSubscriptionPayment && paymentData.orderId) {
          try {
            await supabase
              .from("payment_orders")
              .update({ status: "failed" })
              .eq("id", paymentData.orderId);
          } catch (error) {}
        }
      }

      localStorage.removeItem("pendingRenewal");
      localStorage.removeItem("pendingUpgrade");
      localStorage.removeItem("pendingInternetBankingPayment");

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

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
      setGeneralOrders(generalOrders);

      // Merge and sort purchase history
      const mergedHistory = createUnifiedPurchaseHistory(
        history,
        paymentOrders,
        generalOrders
      );
      setPurchaseHistory(mergedHistory);

      // Load pricing information after orders are loaded (combine both order types)
      if (token) {
        loadRenewalPricing(token, [...paymentOrders, ...generalOrders]);
      }
    } catch (error) {
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
    } finally {
      setLoadingBillingSettings(false);
    }
  };

  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const plans = await PricingService.getPlans();
      setAvailablePlans(plans);
    } catch (error) {
    } finally {
      setLoadingPlans(false);
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
    } finally {
      setLoadingBillingSettings(false);
    }
  };

  const handleRenewToken = async () => {
    if (!user?.id || !token) return;

    // Use the current renewal pricing from state
    if (!renewalPricing) {
      showAlertModal(
        "Pricing Error",
        "Unable to calculate renewal pricing. Please refresh the page.",
        "error"
      );
      return;
    }

    // Store renewal data and show payment modal
    setPendingRenewalData({
      userId: user.id,
      amount: renewalPricing.totalPrice,
      currency: renewalPricing.currency,
      description: `Token renewal for ${token.package} plan with add-ons`,
      token: token,
    });
    setShowRenewalPayment(true);
  };

  const handleRenewalPaymentComplete = async (result: {
    success: boolean;
    chargeId?: string;
    orderId?: string;
    redirectUrl?: string;
    error?: string;
  }) => {
    setShowRenewalPayment(false);

    if (!pendingRenewalData) return;

    setProcessingRenewal(true);
    try {
      if (result.success) {
        // Handle redirect for internet banking
        if (result.redirectUrl) {
          // Save payment status for return handling
          localStorage.setItem(
            "pendingRenewal",
            JSON.stringify({
              ...pendingRenewalData,
              chargeId: result.chargeId,
              orderId: result.orderId,
            })
          );

          window.location.href = result.redirectUrl;
          return;
        }

        await completeRenewal(result);
      } else {
        showAlertModal(
          "Payment Failed",
          `Payment failed: ${result.error}`,
          "error"
        );
      }
    } catch (error) {
      showAlertModal(
        "Renewal Failed",
        "Renewal failed. Please try again.",
        "error"
      );
    } finally {
      setProcessingRenewal(false);
      setPendingRenewalData(null);
    }
  };

  const completeRenewal = async (paymentResult: {
    chargeId?: string;
    orderId?: string;
  }) => {
    if (!pendingRenewalData || !user?.id) return;

    // Create subscription record for the renewal
    const newExpiryDate = new Date();
    newExpiryDate.setMonth(newExpiryDate.getMonth() + 1); // Add 1 month

    const subscriptionRecord = await SubscriptionService.createSubscription({
      user_id: user.id,
      plan_name: `${
        pendingRenewalData.token.package.charAt(0).toUpperCase() +
        pendingRenewalData.token.package.slice(1)
      } Plan`,
      plan_type: pendingRenewalData.token.package as
        | "basic"
        | "standard"
        | "enterprise",
      status: "active",
      amount: pendingRenewalData.amount,
      currency: pendingRenewalData.currency,
      billing_cycle: "monthly",
      started_at: new Date().toISOString(),
      expires_at: newExpiryDate.toISOString(),
      cancelled_at: null,
      payment_method: "internet_banking", // Will be updated based on actual payment method
      transaction_id: paymentResult.chargeId || paymentResult.orderId || null,
    });

    if (subscriptionRecord) {
      // Renew the token using the new service
      await TokenGenerationService.renewToken(
        user.id,
        pendingRenewalData.token
      );

      showAlertModal(
        "Renewal Successful",
        `Token renewed successfully! Paid ${PricingService.formatCurrency(
          pendingRenewalData.amount,
          pendingRenewalData.currency
        )}`,
        "success"
      );

      // Refresh the data
      await loadSubscriptionData(user.id);
    } else {
      showAlertModal(
        "Subscription Creation Failed",
        "Payment was successful but subscription record creation failed.",
        "error"
      );
    }
  };

  const handleSaveProfile = async () => {
    // Here you would typically call an API to update the user profile
    setIsEditing(false);
    // You can add actual API call here when backend is ready
  };

  const getAvailableUpgradePlans = () => {
    if (!token?.package || availablePlans.length === 0) return [];

    // Find current plan in database
    const currentPlan = availablePlans.find(
      (plan) =>
        plan.key === token.package ||
        plan.name.toLowerCase() === token.package.toLowerCase()
    );

    if (!currentPlan) return availablePlans; // If current plan not found, show all plans

    // Convert price from string to number for comparison
    const currentPlanPrice = parseFloat(currentPlan.price || "0");

    // Return plans with higher price (higher tier)
    return availablePlans
      .filter((plan) => {
        const planPrice = parseFloat(plan.price || "0");
        return planPrice > currentPlanPrice && plan.is_active;
      })
      .sort((a, b) => parseFloat(a.price || "0") - parseFloat(b.price || "0"));
  };

  const calculateUpgradePrice = async (targetPlan: string) => {
    if (!token || !renewalPricing || !token.expiredAt) {
      return null;
    }

    try {
      // Calculate what add-ons would remain after upgrade (smart filtering)
      const targetPlanFeatures =
        PLAN_FEATURES[normalizePackage(targetPlan)] || PLAN_FEATURES["basic"];
      const targetFeatureKeys = targetPlanFeatures.map((f) => f.feature_key);
      const remainingAddons = (token.addons || []).filter((addon) => {
        return !targetFeatureKeys.includes(
          addon.feature_key || addon.key || addon.name
        );
      });

      // Get pricing for target plan with only remaining add-ons
      const mockTargetToken = {
        package: targetPlan,
        addons: remainingAddons, // Only add-ons that won't be included in base plan
      };

      const targetPricing = await PricingService.calculateRenewalPrice(
        mockTargetToken,
        []
      );

      // Calculate prorated amount based on remaining days
      const now = new Date();
      const expiredAt = new Date(token.expiredAt);
      const totalDays = billingSettings?.billing_cycle === "yearly" ? 365 : 30;
      const remainingDays = Math.max(
        0,
        Math.ceil((expiredAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );

      // Calculate what user has already paid (prorated)
      const usedDays = totalDays - remainingDays;
      const alreadyPaidForRemainingPeriod =
        (renewalPricing.totalPrice * remainingDays) / totalDays;

      // Calculate target plan price for remaining period
      const targetPriceForRemainingPeriod =
        (targetPricing.totalPrice * remainingDays) / totalDays;

      // Upgrade cost is the difference
      const upgradePrice = Math.max(
        0,
        targetPriceForRemainingPeriod - alreadyPaidForRemainingPeriod
      );

      // For immediate upgrades (testing), calculate full price difference
      const immediateUpgradePrice = Math.max(
        0,
        targetPricing.totalPrice - renewalPricing.totalPrice
      );

      const result = {
        upgradePrice: Math.round(upgradePrice),
        immediateUpgradePrice: Math.round(immediateUpgradePrice), // Add this for testing
        targetPricing,
        remainingDays,
        currency: targetPricing.currency,
      };

      return result;
    } catch (error) {
      return null;
    }
  };

  const handleStartUpgrade = () => {
    setShowUpgradeModal(true);
  };

  const handleUpgradePlan = async (targetPlan: string) => {
    if (!user?.id || !token) return;

    setSelectedUpgradePlan(targetPlan);

    // Calculate upgrade pricing details for display
    try {
      const upgradeDetails = await calculateUpgradePrice(targetPlan);
      setPendingUpgradeDetails(upgradeDetails);
    } catch (error) {
      setPendingUpgradeDetails(null);
    }

    setUpgradeConfirmation(true);
  };

  const confirmUpgrade = async () => {
    if (!selectedUpgradePlan || !user?.id || !token) {
      return;
    }

    try {
      const upgradeDetails = await calculateUpgradePrice(selectedUpgradePlan);

      if (!upgradeDetails) {
        showAlertModal("Error", "Unable to calculate upgrade pricing", "error");
        return;
      }

      // Store upgrade data and show payment modal
      setPendingUpgradeData({
        userId: user.id,
        amount: upgradeDetails.upgradePrice,
        currency: upgradeDetails.currency,
        description: `Plan upgrade to ${selectedUpgradePlan}`,
        targetPlan: selectedUpgradePlan,
        upgradeDetails: upgradeDetails,
        token: token,
      });
      setShowUpgradePayment(true);
      setUpgradeConfirmation(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      showAlertModal(
        "Upgrade Failed",
        `Plan upgrade failed: ${errorMessage}. Please check the console for details.`,
        "error"
      );
    }
  };

  const handleUpgradePaymentComplete = async (result: {
    success: boolean;
    chargeId?: string;
    orderId?: string;
    redirectUrl?: string;
    error?: string;
  }) => {
    setShowUpgradePayment(false);

    if (!pendingUpgradeData) return;

    setProcessingUpgrade(true);
    try {
      if (result.success) {
        // Handle redirect for internet banking
        if (result.redirectUrl) {
          // Save payment status for return handling
          localStorage.setItem(
            "pendingUpgrade",
            JSON.stringify({
              ...pendingUpgradeData,
              chargeId: result.chargeId,
              orderId: result.orderId,
            })
          );

          window.location.href = result.redirectUrl;
          return;
        }

        await completeUpgrade(result);
      } else {
        showAlertModal(
          "Payment Failed",
          `Payment failed: ${result.error}`,
          "error"
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      showAlertModal(
        "Upgrade Failed",
        `Plan upgrade failed: ${errorMessage}. Please check the console for details.`,
        "error"
      );
    } finally {
      setProcessingUpgrade(false);
      setUpgradeConfirmation(false);
      setShowUpgradeModal(false);
      setSelectedUpgradePlan(null);
      setPendingUpgradeDetails(null);
      setPendingUpgradeData(null);
    }
  };

  const handleUpgradeWithOmiseModal = async (targetPlan: string) => {
    if (!user?.id || !token) return;

    try {
      const upgradeDetails = await calculateUpgradePrice(targetPlan);

      if (!upgradeDetails) {
        showAlertModal("Error", "Unable to calculate upgrade pricing", "error");
        return;
      }

      setProcessingUpgrade(true);

      // Create items array for upgrade
      const upgradeItems = [
        {
          id: `upgrade_${targetPlan}`,
          type: "plan_upgrade",
          name: `Upgrade to ${targetPlan} Plan`,
          description: `Plan upgrade from ${token.package} to ${targetPlan}`,
          price: upgradeDetails.upgradePrice,
          quantity: 1,
          period: "month",
        },
      ];

      const result = await OmisePaymentService.processInternetBankingWithModal(
        user.id,
        upgradeDetails.upgradePrice,
        upgradeDetails.currency,
        `Plan upgrade to ${targetPlan}`,
        upgradeItems
      );

      if (result.success) {
        await processUpgrade(targetPlan, result.chargeId);
      } else {
        showAlertModal(
          "Payment Failed",
          `Payment failed: ${result.error}`,
          "error"
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      showAlertModal(
        "Upgrade Failed",
        `Plan upgrade failed: ${errorMessage}. Please check the console for details.`,
        "error"
      );
    } finally {
      setProcessingUpgrade(false);
      setShowUpgradeModal(false);
    }
  };

  const completeUpgrade = async (paymentResult: {
    chargeId?: string;
    orderId?: string;
  }) => {
    if (!pendingUpgradeData || !user?.id) return;

    await processUpgrade(pendingUpgradeData.targetPlan, paymentResult.chargeId);
  };

  const processUpgrade = async (targetPlan: string, chargeId?: string) => {
    if (!user?.id || !token) return;

    try {
      // 1. Deactivate current token
      await TokenService.deactivateToken(user.id);

      // 2. Create new token with target plan using sophisticated composition
      const billingCycle =
        billingSettings?.billing_cycle === "yearly" ? "yearly" : "monthly";
      const newTokenData = composeToken(targetPlan, billingCycle);

      const newToken = await TokenService.createToken(user.id, newTokenData);

      // 3. Create subscription history record
      const upgradeDetails = await calculateUpgradePrice(targetPlan);
      if (upgradeDetails) {
        // Map plan name to plan type enum
        const planTypeMapping: Record<
          string,
          "basic" | "standard" | "enterprise"
        > = {
          starter: "basic",
          basic: "basic",
          pro: "standard",
          standard: "standard",
          enterprise: "enterprise",
        };

        const planType = planTypeMapping[targetPlan.toLowerCase()] || "basic";

        await SubscriptionService.createSubscription({
          user_id: user.id,
          plan_name: targetPlan,
          plan_type: planType,
          amount: upgradeDetails.upgradePrice,
          currency: upgradeDetails.currency,
          billing_cycle:
            billingSettings?.billing_cycle === "yearly" ? "yearly" : "monthly",
          transaction_id: chargeId || null,
          status: "active",
          started_at: new Date().toISOString(),
          expires_at:
            billingSettings?.billing_cycle === "yearly"
              ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelled_at: null,
          payment_method: "credit_card",
        });
      }

      // 4. Refresh token and user data
      await refreshToken();

      const planName =
        availablePlans.find((p) => p.key === targetPlan)?.name || targetPlan;
      showAlertModal(
        "Success",
        `Successfully upgraded to ${planName} plan!`,
        "success"
      );
    } catch (error) {
      // Show more detailed error information
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      showAlertModal(
        "Upgrade Failed",
        `Plan upgrade failed: ${errorMessage}. Please check the console for more details.`,
        "error"
      );
      throw error;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getNextBillingDate = () => {
    if (!token?.expiredAt || !billingSettings?.auto_renewal_enabled) {
      return null;
    }

    // If auto-renewal is enabled, next billing date is the token expiration date
    return token.expiredAt;
  };

  const formatCurrency = (amount: number, currency: string = "THB") => {
    return PricingService.formatCurrency(amount, currency);
  };

  // Calculate separate statistics for different order types
  const calculateOrderStatistics = () => {
    // Calculate subscription-based statistics
    const subscriptionStats = {
      count: subscriptionSummary?.total_subscriptions || 0,
      totalSpent: subscriptionSummary?.total_spent || 0,
      months: subscriptionSummary?.current_streak_months || 0,
      memberSince: subscriptionSummary?.first_subscription_date
        ? new Date(subscriptionSummary.first_subscription_date).getFullYear()
        : null,
    };

    // Calculate payment order statistics
    const paymentOrderStats = {
      count: paymentOrders.length,
      totalSpent: paymentOrders.reduce((sum, order) => {
        return sum + (order.total_amount || 0);
      }, 0),
      firstOrder:
        paymentOrders.length > 0
          ? Math.min(
              ...paymentOrders.map((order) =>
                new Date(order.created_at).getTime()
              )
            )
          : null,
    };

    // Calculate combined statistics
    const combinedStats = {
      totalCount: subscriptionStats.count + paymentOrderStats.count,
      totalSpent: subscriptionStats.totalSpent + paymentOrderStats.totalSpent,
      earliestDate: Math.min(
        ...[
          subscriptionStats.memberSince
            ? new Date(`${subscriptionStats.memberSince}-01-01`).getTime()
            : Infinity,
          paymentOrderStats.firstOrder || Infinity,
        ].filter((date) => date !== Infinity)
      ),
    };

    return {
      subscription: subscriptionStats,
      paymentOrder: paymentOrderStats,
      combined: combinedStats,
    };
  };

  // Pagination helper functions for Purchase History
  const getPaginatedHistory = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return purchaseHistory.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(purchaseHistory.length / itemsPerPage);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < getTotalPages()) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Reset to first page when purchase history changes
  useEffect(() => {
    setCurrentPage(1);
  }, [purchaseHistory]);

  // Token generation helpers (similar to n8n function)
  const randStr = (len = 20) => {
    let out = "";
    while (out.length < len) out += Math.random().toString(36).slice(2);
    return out.slice(0, len);
  };

  const normalizePackage = (p: string) => {
    return String(p || "")
      .trim()
      .toLowerCase();
  };

  const packageCode = (p: string) => {
    const n = normalizePackage(p);
    const cleaned = n.replace(/[^a-z0-9]/gi, "");
    return (cleaned.slice(0, 4) || "pkg").toUpperCase();
  };

  const generateToken = (pkgName: string) => {
    const ts = Date.now().toString(36);
    const rnd = randStr(16);
    const salt = randStr(6);
    const pfx = packageCode(pkgName);
    return `${pfx}-${ts}-${rnd}${salt}`;
  };

  // Feature catalog
  const FEATURE_UNITS = {
    line_chat: "flag",
    facebook_chat: "flag",
    rag_files: "files",
    calendar_agent: "flag",
    gdrive_agent: "flag",
  };

  const PLAN_FEATURES: Record<
    string,
    Array<{ feature_key: string; unit: string; value: number | null }>
  > = {
    basic: [
      { feature_key: "line_chat", unit: FEATURE_UNITS.line_chat, value: null },
      { feature_key: "rag_files", unit: FEATURE_UNITS.rag_files, value: 3 },
    ],
    standard: [
      { feature_key: "line_chat", unit: FEATURE_UNITS.line_chat, value: null },
      {
        feature_key: "facebook_chat",
        unit: FEATURE_UNITS.facebook_chat,
        value: null,
      },
      { feature_key: "rag_files", unit: FEATURE_UNITS.rag_files, value: 5 },
    ],
    enterprise: [
      { feature_key: "line_chat", unit: FEATURE_UNITS.line_chat, value: null },
      {
        feature_key: "facebook_chat",
        unit: FEATURE_UNITS.facebook_chat,
        value: null,
      },
      {
        feature_key: "calendar_agent",
        unit: FEATURE_UNITS.calendar_agent,
        value: null,
      },
      {
        feature_key: "gdrive_agent",
        unit: FEATURE_UNITS.gdrive_agent,
        value: null,
      },
      { feature_key: "rag_files", unit: FEATURE_UNITS.rag_files, value: 10 },
    ],
  };

  const calcExpiry = (type = "monthly") => {
    const now = new Date();
    const expiry = new Date(now);
    if (type.toLowerCase() === "monthly") expiry.setMonth(now.getMonth() + 1);
    else if (type.toLowerCase() === "yearly")
      expiry.setFullYear(now.getFullYear() + 1);
    return expiry.toISOString();
  };

  const composeToken = (pkg: string, type: string) => {
    const cleanPkg = normalizePackage(pkg || "basic");
    const tokenStr = generateToken(cleanPkg);
    const features = PLAN_FEATURES[cleanPkg] || PLAN_FEATURES["basic"];
    const expiredAt = calcExpiry(type);

    // Filter out add-ons that are now included in the base plan
    const baseFeatureKeys = features.map((f) => f.feature_key);
    const filteredAddons = (token?.addons || []).filter((addon) => {
      // If the add-on's feature is now included in the base plan, remove it
      return !baseFeatureKeys.includes(
        addon.feature_key || addon.key || addon.name
      );
    });

    return {
      package: cleanPkg,
      token: tokenStr,
      status: "active", // Set to active for upgrades
      type: (type || "monthly").toLowerCase(),
      features,
      addons: filteredAddons, // Use filtered add-ons instead of all
      expiredAt,
    };
  };

  const getPlanFeatures = (planKey: string) => {
    const cleanPkg = normalizePackage(planKey);
    return PLAN_FEATURES[cleanPkg] || PLAN_FEATURES["basic"];
  };

  const formatFeatureValue = (feature: {
    feature_key: string;
    unit: string;
    value: number | null;
  }) => {
    if (feature.value === null) {
      return "Enabled";
    }
    if (feature.unit === "files") {
      return `${feature.value} files`;
    }
    return feature.value.toString();
  };

  const getAddonsIncludedInPlan = (planKey: string) => {
    const cleanPkg = normalizePackage(planKey);
    const baseFeatureKeys = (
      PLAN_FEATURES[cleanPkg] || PLAN_FEATURES["basic"]
    ).map((f) => f.feature_key);

    // Find current add-ons that would be included in the new plan
    return (token?.addons || []).filter((addon) => {
      return baseFeatureKeys.includes(
        addon.feature_key || addon.key || addon.name
      );
    });
  };

  const getRemainingAddons = (planKey: string) => {
    const cleanPkg = normalizePackage(planKey);
    const baseFeatureKeys = (
      PLAN_FEATURES[cleanPkg] || PLAN_FEATURES["basic"]
    ).map((f) => f.feature_key);

    // Find current add-ons that would still be add-ons in the new plan
    return (token?.addons || []).filter((addon) => {
      return !baseFeatureKeys.includes(
        addon.feature_key || addon.key || addon.name
      );
    });
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

  // Create unified purchase history from both orders and subscriptions
  const createUnifiedPurchaseHistory = (
    subscriptions: SubscriptionHistory[],
    paymentOrders: PaymentOrder[],
    generalOrders: any[]
  ): PurchaseHistoryItem[] => {
    const allItems: PurchaseHistoryItem[] = [];

    // Add subscription history items (Yellow box - Subscription Purchase)
    subscriptions.forEach((subscription) => {
      allItems.push({
        id: `subscription-${subscription.id}`,
        type: "subscription",
        date: subscription.created_at,
        title: "Subscription Purchase (1 item)",
        orderNumber: subscription.transaction_id || subscription.id.slice(0, 8),
        items: [
          {
            name: "Token Renewal",
            description: `${SubscriptionService.getPlanDisplayName(
              subscription.plan_type
            )} subscription renewal`,
            category: "subscription",
            price: subscription.amount,
            quantity: 1,
          },
        ],
        total: subscription.amount,
        currency: subscription.currency,
        status: subscription.status,
        paymentMethod: subscription.payment_method || "credit card",
        planType: subscription.plan_type,
        planName: subscription.plan_name,
        features: [], // Will be filled based on plan type
        nextExpiry: subscription.expires_at || "",
      });
    });

    // Add payment orders (Purple box - Add-on Purchase)
    paymentOrders
      .filter((order) => order.status === "completed")
      .forEach((order) => {
        const orderItems = Array.isArray(order.items) ? order.items : [];
        allItems.push({
          id: `order-${order.id}`,
          type: "order",
          date: order.created_at,
          title: `Add-on Purchase (${orderItems.length} item${
            orderItems.length > 1 ? "s" : ""
          })`,
          orderNumber: order.id.slice(0, 8),
          items: orderItems.map((item) => ({
            name: item.feature?.name || "Unknown Item",
            description: item.feature?.description || "",
            category: item.feature?.category || "agent",
            price: item.price || 0,
            quantity: item.quantity || 1,
          })),
          total: order.total_amount,
          currency: order.currency,
          status: "completed",
          paymentMethod: order.payment_method || "credit card",
          orderId: order.id,
        });
      });

    // Add general orders (Purple box - Add-on Purchase)
    generalOrders
      .filter(
        (order) => order.status === "completed" || order.status === "delivered"
      )
      .forEach((order) => {
        const orderItems = Array.isArray(order.order_items)
          ? order.order_items
          : [];
        allItems.push({
          id: `general-${order.id}`,
          type: "order",
          date: order.created_at,
          title: `Add-on Purchase (${orderItems.length} item${
            orderItems.length > 1 ? "s" : ""
          })`,
          orderNumber: order.order_number || order.id.slice(0, 8),
          items: orderItems.map((item: any) => ({
            name: item.product_name || "Unknown Item",
            description: item.product_description || "",
            category: item.product_category || "agent",
            price: item.unit_price || 0,
            quantity: item.quantity || 1,
          })),
          total: order.total_amount,
          currency: order.currency || "THB",
          status: order.status,
          paymentMethod: "credit card",
          orderId: order.id,
        });
      });

    // Sort by date (newest first)
    return allItems.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
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
                      {billingSettings?.auto_renewal_enabled &&
                      getNextBillingDate()
                        ? formatDate(getNextBillingDate()!)
                        : t("users.noAutoRenewal")}
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

              {/* Enhanced Overview with Separate Statistics */}
              {(subscriptionSummary || paymentOrders.length > 0) && (
                <div className="space-y-4">
                  {/* Combined Overview */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      {t("users.overallOverview")}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {calculateOrderStatistics().combined.totalCount}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {t("users.totalOrders")}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(
                            calculateOrderStatistics().combined.totalSpent
                          )}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {t("users.totalSpent")}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                          {subscriptionSummary?.current_streak_months || 0}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {t("users.streakMonths")}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {isFinite(
                            calculateOrderStatistics().combined.earliestDate
                          )
                            ? new Date(
                                calculateOrderStatistics().combined.earliestDate
                              ).getFullYear()
                            : "-"}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {t("users.memberSince")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Separate Statistics */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Subscription Statistics */}
                    {subscriptionSummary && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          {t("users.subscriptionOverview")}
                        </h4>
                        <div className="grid grid-cols-2 gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                          <div className="text-center">
                            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                              {calculateOrderStatistics().subscription.count}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {t("users.subscriptions")}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(
                                calculateOrderStatistics().subscription
                                  .totalSpent
                              )}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {t("users.subscriptionSpent")}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Order Statistics */}
                    {paymentOrders.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          {t("users.purchaseOverview")}
                        </h4>
                        <div className="grid grid-cols-2 gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-700 dark:text-green-300">
                              {calculateOrderStatistics().paymentOrder.count}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {t("users.purchases")}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(
                                calculateOrderStatistics().paymentOrder
                                  .totalSpent
                              )}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {t("users.purchaseSpent")}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Purchase History (Unified Orders & Subscriptions) */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      Purchase History
                    </h3>
                  </div>
                  {purchaseHistory.length > 0 && (
                    <button className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 text-sm font-medium">
                      {t("users.viewAll")}
                    </button>
                  )}
                </div>

                {loadingSubscriptions ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full"></div>
                  </div>
                ) : purchaseHistory.length > 0 ? (
                  <div className="space-y-4">
                    {/* Pagination Info */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t("users.showing")}{" "}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {(currentPage - 1) * itemsPerPage + 1}
                        </span>{" "}
                        {t("users.to")}{" "}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {Math.min(
                            currentPage * itemsPerPage,
                            purchaseHistory.length
                          )}
                        </span>{" "}
                        {t("users.of")}{" "}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {purchaseHistory.length}
                        </span>{" "}
                        {t("users.orders")}
                      </span>
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
                        {t("users.page")} {currentPage} {t("users.of")}{" "}
                        {getTotalPages()}
                      </span>
                    </div>

                    {/* Purchase History Items */}
                    <div className="space-y-3">
                      {getPaginatedHistory().map((item) => {
                        const isExpanded = expandedOrders.has(item.id);
                        const isSubscription = item.type === "subscription";

                        return (
                          <div
                            key={item.id}
                            className="rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden"
                          >
                            {/* Main Item Info */}
                            <div className="flex items-center justify-between p-3">
                              <div className="flex items-center gap-3">
                                {/* Icon with color coding */}
                                <div
                                  className={`p-2 rounded-lg ${
                                    isSubscription
                                      ? "bg-yellow-100 dark:bg-yellow-900/30"
                                      : "bg-purple-100 dark:bg-purple-900/30"
                                  }`}
                                >
                                  {isSubscription ? (
                                    <RefreshCw
                                      className={`w-4 h-4 ${
                                        isSubscription
                                          ? "text-yellow-600 dark:text-yellow-400"
                                          : "text-purple-600 dark:text-purple-400"
                                      }`}
                                    />
                                  ) : (
                                    <Package
                                      className={`w-4 h-4 ${
                                        isSubscription
                                          ? "text-yellow-600 dark:text-yellow-400"
                                          : "text-purple-600 dark:text-purple-400"
                                      }`}
                                    />
                                  )}
                                </div>

                                <div>
                                  <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                    {item.title}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {formatDate(item.date)} • Order #
                                    {item.orderNumber}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {isSubscription
                                      ? "token renewal"
                                      : item.items
                                          .map((orderItem) => orderItem.name)
                                          .join(", ")}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                    {formatCurrency(item.total, item.currency)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {isSubscription
                                      ? "subscription"
                                      : "one-time"}
                                  </div>
                                </div>

                                {/* Status Badge */}
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    isSubscription
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                      : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                  }`}
                                >
                                  {isSubscription ? "Subscription" : "Add-on"}
                                </span>

                                {/* Action Buttons */}
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => toggleOrderDetails(item.id)}
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
                                        {isSubscription
                                          ? "Subscription ID:"
                                          : "Order ID:"}
                                      </span>
                                      <div className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded mt-1">
                                        {item.orderId ||
                                          item.id.replace(
                                            /^(subscription|order|general)-/,
                                            ""
                                          )}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">
                                        Payment Method:
                                      </span>
                                      <div className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                                        {item.paymentMethod}
                                      </div>
                                    </div>
                                  </div>

                                  {isSubscription ? (
                                    /* Subscription Details */
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                                        Plan Details:
                                      </span>
                                      <div className="mt-2 p-3 bg-white dark:bg-gray-700 rounded border">
                                        <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-2">
                                          {item.planName ||
                                            `${item.planType} Plan`}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                          Features: Token renewal, API access,
                                          Premium support
                                        </div>
                                        <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                          Next Expiry:{" "}
                                          {item.nextExpiry
                                            ? formatDate(item.nextExpiry)
                                            : "N/A"}
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Order Items Details */
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                                        Items Purchased:
                                      </span>
                                      <div className="mt-2 space-y-2">
                                        {item.items.map((orderItem, idx) => (
                                          <div
                                            key={idx}
                                            className="flex justify-between items-start p-2 bg-white dark:bg-gray-700 rounded border"
                                          >
                                            <div className="flex-1">
                                              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                                {orderItem.name}
                                              </div>
                                              {orderItem.description && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                  {orderItem.description}
                                                </div>
                                              )}
                                              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                                Category: {orderItem.category}
                                              </div>
                                            </div>
                                            <div className="text-right ml-3">
                                              <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                                {formatCurrency(
                                                  orderItem.price *
                                                    orderItem.quantity,
                                                  item.currency
                                                )}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {formatCurrency(
                                                  orderItem.price,
                                                  item.currency
                                                )}{" "}
                                                × {orderItem.quantity}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      Total:
                                    </span>
                                    <span
                                      className={`font-bold text-lg ${
                                        isSubscription
                                          ? "text-yellow-600 dark:text-yellow-400"
                                          : "text-purple-600 dark:text-purple-400"
                                      }`}
                                    >
                                      {formatCurrency(
                                        item.total,
                                        item.currency
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

                    {/* Pagination Controls */}
                    {getTotalPages() > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 disabled:hover:border-gray-300 dark:disabled:hover:border-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            {t("users.previous")}
                          </button>
                          <button
                            onClick={handleNextPage}
                            disabled={currentPage === getTotalPages()}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800 disabled:hover:border-gray-300 dark:disabled:hover:border-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            {t("users.next")}
                          </button>
                        </div>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-start">
                          {Array.from(
                            { length: getTotalPages() },
                            (_, i) => i + 1
                          )
                            .filter((page) => {
                              const totalPages = getTotalPages();
                              if (totalPages <= 7) return true; // Show all pages if 7 or fewer
                              if (page === 1 || page === totalPages)
                                return true; // Always show first and last
                              if (Math.abs(page - currentPage) <= 2)
                                return true; // Show 2 pages around current
                              return false;
                            })
                            .map((page, index, filteredPages) => {
                              const prevPage = filteredPages[index - 1];
                              const showEllipsis =
                                prevPage && page - prevPage > 1;

                              return (
                                <React.Fragment key={page}>
                                  {showEllipsis && (
                                    <span className="px-2 py-1 text-sm text-gray-400 dark:text-gray-500 select-none">
                                      ...
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handlePageChange(page)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                      currentPage === page
                                        ? "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-md transform scale-105"
                                        : "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-900 dark:hover:text-gray-100 shadow-sm hover:shadow-md"
                                    }`}
                                  >
                                    {page}
                                  </button>
                                </React.Fragment>
                              );
                            })}
                        </div>
                      </div>
                    )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleStartUpgrade}
                  disabled={
                    loadingPlans || getAvailableUpgradePlans().length === 0
                  }
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {loadingPlans ? t("common.loading") : t("users.upgradePlan")}
                </button>

                <button
                  onClick={() => setShowBillingManagement(true)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors text-sm"
                >
                  {t("users.manageBilling")}
                </button>

                {/* Renewal Button */}
                {token && renewalPricing && (
                  <button
                    onClick={handleRenewToken}
                    disabled={processingRenewal}
                    className="sm:col-span-2 lg:col-span-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {processingRenewal ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Renew Subscription (
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

      {/* Plan Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("users.upgradePlan")}
              </h3>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setSelectedUpgradePlan(null);
                  setUpgradeConfirmation(false);
                }}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {!upgradeConfirmation ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t("users.selectUpgradePlan")}
                </p>
                {loadingPlans ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      {t("common.loading")}
                    </span>
                  </div>
                ) : getAvailableUpgradePlans().length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-500 dark:text-gray-400 mb-2">
                      {t("users.noUpgradeAvailable")}
                    </div>
                    <div className="text-sm text-gray-400 dark:text-gray-500">
                      {t("users.alreadyOnHighestPlan")}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getAvailableUpgradePlans().map((plan) => (
                      <div
                        key={plan.id}
                        className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {plan.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {plan.description ||
                                "Enhanced features and capabilities"}
                            </div>

                            {/* Display plan features */}
                            <div className="space-y-1 mb-2">
                              {getPlanFeatures(plan.key).map((feature, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center text-xs text-gray-500 dark:text-gray-400"
                                >
                                  <CheckCircle className="w-3 h-3 text-emerald-500 mr-1" />
                                  <span className="capitalize">
                                    {feature.feature_key.replace("_", " ")}:{" "}
                                    {formatFeatureValue(feature)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {plan.price && (
                              <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                {formatCurrency(
                                  parseFloat(plan.price),
                                  plan.currency || "THB"
                                )}
                                /{plan.billing_cycle || "month"}
                              </div>
                            )}
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {t("users.confirmUpgrade")}{" "}
                    <span className="font-medium">
                      {availablePlans.find((p) => p.key === selectedUpgradePlan)
                        ?.name || selectedUpgradePlan}
                    </span>{" "}
                    plan?
                  </p>

                  {/* Show features that will be included */}
                  {selectedUpgradePlan && (
                    <div className="space-y-3">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                          Base Features Included:
                        </h4>
                        <div className="space-y-1">
                          {getPlanFeatures(selectedUpgradePlan).map(
                            (feature, idx) => (
                              <div
                                key={idx}
                                className="flex items-center text-xs text-gray-600 dark:text-gray-300"
                              >
                                <CheckCircle className="w-3 h-3 text-emerald-500 mr-2" />
                                <span className="capitalize">
                                  {feature.feature_key.replace("_", " ")}:{" "}
                                  {formatFeatureValue(feature)}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Show add-ons that will be automatically included */}
                      {getAddonsIncludedInPlan(selectedUpgradePlan).length >
                        0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                            ✨ Add-ons Now Included (No Extra Cost):
                          </h4>
                          <div className="space-y-1">
                            {getAddonsIncludedInPlan(selectedUpgradePlan).map(
                              (addon, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center text-xs text-emerald-700 dark:text-emerald-300"
                                >
                                  <CheckCircle className="w-3 h-3 text-emerald-600 mr-2" />
                                  <span className="capitalize">
                                    {(
                                      addon.feature_key ||
                                      addon.key ||
                                      addon.name ||
                                      ""
                                    ).replace("_", " ")}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Show remaining add-ons */}
                      {getRemainingAddons(selectedUpgradePlan).length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                            📦 Remaining Add-ons:
                          </h4>
                          <div className="space-y-1">
                            {getRemainingAddons(selectedUpgradePlan).map(
                              (addon, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center text-xs text-blue-700 dark:text-blue-300"
                                >
                                  <Package className="w-3 h-3 text-blue-600 mr-2" />
                                  <span className="capitalize">
                                    {(
                                      addon.feature_key ||
                                      addon.key ||
                                      addon.name ||
                                      ""
                                    ).replace("_", " ")}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Show upgrade pricing breakdown */}
                      {pendingUpgradeDetails && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-indigo-800 dark:text-indigo-200 mb-2">
                            💰 Upgrade Pricing:
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                              <span>Current Plan Cost:</span>
                              <span>
                                {formatCurrency(
                                  renewalPricing?.totalPrice || 0,
                                  pendingUpgradeDetails.currency
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                              <span>New Plan Cost:</span>
                              <span>
                                {formatCurrency(
                                  pendingUpgradeDetails.targetPricing
                                    ?.totalPrice || 0,
                                  pendingUpgradeDetails.currency
                                )}
                              </span>
                            </div>
                            <hr className="border-gray-300 dark:border-gray-600" />
                            <div className="flex justify-between items-center font-medium text-indigo-700 dark:text-indigo-300">
                              <span>Immediate Upgrade Cost:</span>
                              <span>
                                {formatCurrency(
                                  pendingUpgradeDetails.immediateUpgradePrice ||
                                    0,
                                  pendingUpgradeDetails.currency
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                              <span>Prorated Upgrade Cost:</span>
                              <span>
                                {formatCurrency(
                                  pendingUpgradeDetails.upgradePrice || 0,
                                  pendingUpgradeDetails.currency
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setUpgradeConfirmation(false);
                      setPendingUpgradeDetails(null);
                    }}
                    disabled={processingUpgrade}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={confirmUpgrade}
                    disabled={processingUpgrade}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {processingUpgrade ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t("common.processing")}
                      </>
                    ) : (
                      t("users.confirmUpgrade")
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Billing Management Modal */}
      {showBillingManagement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-auto animate-in slide-in-from-bottom-4 duration-300">
            <BillingManagement
              customerId={user?.id}
              onClose={() => setShowBillingManagement(false)}
              token={token}
              billingSettings={billingSettings}
            />
          </div>
        </div>
      )}

      {/* Payment Method Selection for Renewal */}
      {showRenewalPayment && pendingRenewalData && (
        <PaymentMethodSelection
          isOpen={showRenewalPayment}
          onClose={() => setShowRenewalPayment(false)}
          onPaymentComplete={handleRenewalPaymentComplete}
          userId={pendingRenewalData.userId}
          amount={pendingRenewalData.amount}
          currency={pendingRenewalData.currency}
          description={pendingRenewalData.description}
          title="Renew Subscription"
          isSubscriptionPayment={true}
          subscriptionContext={{
            planName: `${
              pendingRenewalData.token.package.charAt(0).toUpperCase() +
              pendingRenewalData.token.package.slice(1)
            } Plan`,
            planType: pendingRenewalData.token.package,
            token: pendingRenewalData.token,
          }}
        />
      )}

      {/* Payment Method Selection for Upgrade */}
      {showUpgradePayment && pendingUpgradeData && (
        <PaymentMethodSelection
          isOpen={showUpgradePayment}
          onClose={() => setShowUpgradePayment(false)}
          onPaymentComplete={handleUpgradePaymentComplete}
          userId={pendingUpgradeData.userId}
          amount={pendingUpgradeData.amount}
          currency={pendingUpgradeData.currency}
          description={pendingUpgradeData.description}
          title="Upgrade Plan"
          isSubscriptionPayment={true}
          subscriptionContext={{
            planName: pendingUpgradeData.targetPlan,
            planType: pendingUpgradeData.targetPlan.toLowerCase(),
            token: pendingUpgradeData.token,
          }}
        />
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
