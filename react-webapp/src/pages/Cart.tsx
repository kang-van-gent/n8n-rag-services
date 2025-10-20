import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Lock,
  Check,
  ArrowRight,
  Package,
  Tag,
  AlertCircle,
  X,
  Edit,
  Star,
  PlusCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Layout } from "../components/Layout";
import { useCart, PaymentMethod } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useToken } from "../contexts/TokenContext";
import { OmisePaymentService } from "../services/OmisePaymentService";
import { TokenService } from "../services/tokenService";
import OmisePaymentForm from "../components/OmisePaymentForm";
import { cn } from "../utils/cn";
import { supabase } from "../lib/supabase";

export function Cart() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { refreshToken } = useToken();
  const {
    items,
    totalAmount,
    itemCount,
    paymentMethods,
    selectedPaymentMethod,
    isLoadingPaymentMethods,
    removeItem,
    updateQuantity,
    clearCart,
    selectPaymentMethod,
    loadPaymentMethods,
    checkout,
  } = useCart();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isCheckoutMode, setIsCheckoutMode] = useState(false); // Track if payment form was opened from checkout

  // Handle payment returns from internet banking
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");

    if (paymentStatus === "success") {
      // Handle successful payment return
      const pendingCheckout = localStorage.getItem("pendingCartCheckout");

      if (pendingCheckout) {
        const checkoutData = JSON.parse(pendingCheckout);
        localStorage.removeItem("pendingCartCheckout");

        // Add purchased add-ons to user's token and update payment order status
        if (user && checkoutData.items) {
          Promise.all([
            // Add add-ons to token
            TokenService.addAddonsToToken(user.id, checkoutData.items),
            // Update payment order status to completed
            checkoutData.orderId
              ? supabase
                  .from("payment_orders")
                  .update({
                    status: "completed",
                    completed_at: new Date().toISOString(),
                  })
                  .eq("id", checkoutData.orderId)
              : Promise.resolve(),
          ])
            .then(() => {
              console.log(
                "✅ Add-ons added to user token and payment order updated after internet banking payment:",
                checkoutData.items
              );
              // Refresh token context to show new add-ons immediately
              if (refreshToken) {
                refreshToken();
              }
            })
            .catch((error) => {
              console.error(
                "Failed to add add-ons to token or update payment order after payment:",
                error
              );
            });
        }

        // Clear cart and show success
        clearCart();
        setCheckoutSuccess(true);
        setOrderId(checkoutData.orderId);
      }

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === "failed") {
      setCheckoutError(
        "Internet banking payment was cancelled or failed. Please try again."
      );

      // Clean up any stored pending data
      localStorage.removeItem("pendingCartCheckout");

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [clearCart]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const handleQuantityChange = (itemId: string, change: number) => {
    const item = items.find((i) => i.id === itemId);
    if (item) {
      updateQuantity(itemId, item.quantity + change);
    }
  };

  const handleCheckout = async () => {
    // If no payment method exists, show payment form instead of showing error
    if (!selectedPaymentMethod) {
      setIsCheckoutMode(true);
      setShowPaymentForm(true);
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      const result = await checkout();

      if (result.success) {
        // Handle redirect for internet banking (same as handleInternetBankingCheckout)
        if (result.redirectUrl) {
          // Save cart state for return handling
          localStorage.setItem(
            "pendingCartCheckout",
            JSON.stringify({
              orderId: result.orderId,
              chargeId: result.chargeId,
              items: items,
            })
          );

          window.location.href = result.redirectUrl;
          return;
        }

        // Direct success (no redirect needed)
        setCheckoutSuccess(true);
        setOrderId(result.orderId || null);
      } else {
        setCheckoutError(result.error || "Checkout failed");
      }
    } catch (error) {
      setCheckoutError("An unexpected error occurred");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleInternetBankingCheckout = async () => {
    if (!user?.id) {
      setCheckoutError("Please log in to continue");
      return;
    }

    if (items.length === 0) {
      setCheckoutError("Your cart is empty");
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      // Calculate total with tax
      const subtotal = totalAmount;
      const tax = subtotal * 0.07; // 7% tax
      const total = subtotal + tax;

      const result = await OmisePaymentService.processInternetBankingWithModal(
        user.id,
        total,
        "THB",
        `Purchase of ${items.length} add-on(s)`,
        items
      );

      if (result.success) {
        // Handle redirect for internet banking
        if (result.redirectUrl) {
          // Save cart state for return handling
          localStorage.setItem(
            "pendingCartCheckout",
            JSON.stringify({
              orderId: result.orderId,
              chargeId: result.chargeId,
              items: items,
            })
          );

          window.location.href = result.redirectUrl;
          return;
        }

        // Direct success (no redirect needed)
        clearCart();
        setCheckoutSuccess(true);
        setOrderId(result.orderId || null);
      } else {
        setCheckoutError(result.error || "Payment failed");
      }
    } catch (error) {
      console.error("Internet banking checkout error:", error);
      setCheckoutError("An unexpected error occurred");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handlePaymentMethodAdded = async (paymentMethod: PaymentMethod) => {
    console.log("Payment method added successfully:", paymentMethod);
    setShowPaymentForm(false);
    console.log("Modal should be closed now");

    await loadPaymentMethods(); // Reload payment methods from database
    selectPaymentMethod(paymentMethod.id); // Select the newly added method

    // Automatically proceed with checkout if we were in checkout mode
    if (isCheckoutMode) {
      console.log("Checkout mode detected, proceeding with checkout");
      setIsCheckoutMode(false); // Reset checkout mode
      setTimeout(() => {
        handleCheckout();
      }, 500); // Small delay to ensure payment method is selected
    }
  };

  const getPaymentMethodIcon = (type: PaymentMethod["type"]) => {
    switch (type) {
      case "credit_card":
        return <CreditCard className="w-5 h-5" />;
      case "paypal":
        return (
          <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
            P
          </div>
        );
      case "bank_transfer":
        return (
          <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center text-white text-xs font-bold">
            B
          </div>
        );
      case "crypto":
        return (
          <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-bold">
            ₿
          </div>
        );
      case "internet_banking":
        return (
          <div className="w-5 h-5 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 rounded-md flex items-center justify-center text-white shadow-sm">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3L2 8v2h20V8l-10-5zM4 12v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-6H4zm4 5c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm4 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" />
            </svg>
          </div>
        );
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  if (checkoutSuccess) {
    return (
      <Layout title={t("cart.orderComplete")}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {t("cart.orderCompleteTitle")}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t("cart.orderCompleteMessage")}
            </p>
            {orderId && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("cart.orderId")}:
                </span>
                <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                  {orderId}
                </span>
              </div>
            )}
            <div className="mt-8 flex gap-4 justify-center">
              <button
                onClick={() => (window.location.href = "/rag-settings")}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Package className="w-5 h-5" />
                {t("cart.viewMyFeatures")}
              </button>
              <button
                onClick={() => {
                  setCheckoutSuccess(false);
                  setOrderId(null);
                }}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                {t("cart.continueShopping")}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t("navigation.cart")}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {t("cart.title")}
                      </h1>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t("cart.manageItems")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2"></div>
                </div>
                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 text-sm border border-red-200/50 dark:border-red-500/30 w-full sm:w-auto font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Cart Items List */}
            <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {t("cart.empty.title")}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {t("cart.empty.description")}
                  </p>
                  <button
                    onClick={() => (window.location.href = "/rag-settings")}
                    className={cn(
                      "flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mx-auto",
                      "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border border-blue-400"
                    )}
                  >
                    <Package className="w-4 h-4" />
                    {t("cart.browseAddons")}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-500/30 rounded-2xl p-4 sm:p-6 hover:shadow-xl hover:border-purple-200/60 dark:hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1"
                    >
                      {/* Feature Badge */}

                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Feature Icon & Details */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Package className="w-6 h-6 text-white" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base sm:text-lg mb-1">
                              {item.feature.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                              {item.feature.description}
                            </p>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <Tag className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  {formatCurrency(item.price)}/{item.period}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Controls Section */}
                        <div className="flex flex-col sm:items-end gap-3 sm:min-w-0">
                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="self-end w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-all duration-200 hover:scale-110 group/remove"
                          >
                            <X className="w-4 h-4 text-red-500 group-hover/remove:text-red-600" />
                          </button>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-2">
                            <button
                              onClick={() => handleQuantityChange(item.id, -1)}
                              disabled={item.quantity <= 1}
                              className="w-8 h-8 rounded-lg bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                              <Minus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                            </button>
                            <span className="w-8 text-center font-semibold text-gray-900 dark:text-gray-100">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(item.id, 1)}
                              disabled={item.quantity >= 1}
                              className="w-8 h-8 rounded-lg bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                            </button>
                          </div>

                          {/* Item Total */}
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatCurrency(item.price * item.quantity)}
                            </div>
                            <div className="text-xs text-gray-500">
                              per {item.period}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary & Payment */}
          <div className="space-y-4 sm:space-y-6">
            {/* Order Summary */}
            <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t("cart.orderSummary")}
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>
                    {t("cart.subtotal")} ({itemCount}{" "}
                    {itemCount === 1 ? t("cart.item") : t("cart.items")})
                  </span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>{t("cart.tax")}</span>
                  <span>{formatCurrency(totalAmount * 0.07)}</span>
                </div>
                <hr className="border-gray-200 dark:border-gray-700" />
                <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-gray-100">
                  <span>{t("cart.total")}</span>
                  <span>{formatCurrency(totalAmount * 1.07)}</span>
                </div>
              </div>

              {items.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
                    <Star className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-800 dark:text-blue-300">
                      Add-ons will be activated immediately after payment
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Methods */}
            {items.length > 0 && (
              <div className="bg-white/90 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-gray-200/40 dark:border-gray-500/30 shadow-lg shadow-gray-200/60 dark:shadow-none">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t("cart.paymentMethod")}
                  </h2>
                  <button
                    onClick={() => {
                      setIsCheckoutMode(false); // Not in checkout mode when manually adding
                      setShowPaymentForm(true);
                    }}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {t("cart.addNew")}
                  </button>
                </div>

                {isLoadingPaymentMethods ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      Loading payment methods...
                    </span>
                  </div>
                ) : paymentMethods.length === 0 ? (
                  <div className="text-center py-6">
                    <CreditCard className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      No Saved Payment Methods
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                      You can add a payment method now or during checkout.
                    </p>
                    <button
                      onClick={() => {
                        setIsCheckoutMode(false); // Not in checkout mode when manually adding
                        setShowPaymentForm(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors mx-auto text-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Add Payment Method
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className={cn(
                          "flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                          selectedPaymentMethod?.id === method.id
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        )}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={selectedPaymentMethod?.id === method.id}
                          onChange={() => selectPaymentMethod(method.id)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(method.type)}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {method.displayName}
                          </span>
                          {method.isDefault && (
                            <span className="px-2 py-1 text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded">
                              Default
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Checkout Buttons */}
                <div className="mt-6">
                  {checkoutError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-800 dark:text-red-300">
                        {checkoutError}
                      </span>
                    </div>
                  )}

                  {/* Primary Checkout Button */}
                  <button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed mb-3"
                  >
                    {isCheckingOut ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t("cart.processing")}...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        {paymentMethods.length === 0
                          ? "Continue to Payment"
                          : t("cart.secureCheckout")}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Internet Banking Button */}
                  <button
                    onClick={handleInternetBankingCheckout}
                    disabled={isCheckingOut}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    {isCheckingOut ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        Pay with Internet Banking
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-500">
                    <Lock className="w-4 h-4" />
                    <span>Secured by Omise & SSL encryption</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Omise Payment Form Modal */}
        {showPaymentForm && user?.id && (
          <OmisePaymentForm
            userId={user.id}
            onSuccess={handlePaymentMethodAdded}
            onCancel={() => {
              setShowPaymentForm(false);
              setIsCheckoutMode(false); // Reset checkout mode on cancel
            }}
            onError={(error) => setCheckoutError(error)}
            autoSetDefault={paymentMethods.length === 0}
          />
        )}
      </div>
    </Layout>
  );
}
