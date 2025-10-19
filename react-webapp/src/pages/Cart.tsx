import React, { useState } from "react";
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
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Layout } from "../components/Layout";
import { useCart, PaymentMethod } from "../contexts/CartContext";
import { cn } from "../utils/cn";

export function Cart() {
  const { t } = useTranslation();
  const {
    items,
    totalAmount,
    itemCount,
    paymentMethods,
    selectedPaymentMethod,
    removeItem,
    updateQuantity,
    clearCart,
    selectPaymentMethod,
    addPaymentMethod,
    checkout,
  } = useCart();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: "credit_card" as const,
    displayName: "",
    details: {
      cardNumber: "",
      expiryDate: "",
      cardholderName: "",
      cvv: "",
    },
    isDefault: false,
  });
  const [orderId, setOrderId] = useState<string | null>(null);

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
    if (!selectedPaymentMethod) {
      setCheckoutError("Please select a payment method");
      return;
    }

    setIsCheckingOut(true);
    setCheckoutError(null);

    try {
      const result = await checkout();
      if (result.success) {
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

  const handleAddPaymentMethod = () => {
    if (
      !newPaymentMethod.details.cardNumber ||
      !newPaymentMethod.details.expiryDate ||
      !newPaymentMethod.details.cardholderName
    ) {
      alert("Please fill in all required fields");
      return;
    }

    // Format display name
    const lastFourDigits = newPaymentMethod.details.cardNumber.slice(-4);
    const cardType = newPaymentMethod.details.cardNumber.startsWith("4")
      ? "Visa"
      : "Mastercard";

    addPaymentMethod({
      ...newPaymentMethod,
      displayName: `${cardType} ending in ${lastFourDigits}`,
      details: {
        ...newPaymentMethod.details,
        cardNumber: lastFourDigits, // Only store last 4 digits
      },
    });

    // Reset form
    setNewPaymentMethod({
      type: "credit_card",
      displayName: "",
      details: {
        cardNumber: "",
        expiryDate: "",
        cardholderName: "",
        cvv: "",
      },
      isDefault: false,
    });
    setShowPaymentForm(false);
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600 dark:text-blue-400" />
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Shopping Cart
                  </h1>
                </div>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium w-fit">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
              </div>
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm sm:text-base w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Cart
                </button>
              )}
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
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Package className="w-5 h-5" />
                    Browse Add-ons
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 sm:p-4 border border-gray-200/30 dark:border-gray-500/20 rounded-xl bg-white/50 dark:bg-gray-800/50"
                    >
                      {/* Mobile Layout */}
                      <div className="flex items-start gap-4 w-full">
                        {/* Feature Icon */}
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
                        </div>

                        {/* Feature Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                            {item.feature.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 sm:line-clamp-1">
                            {item.feature.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                            <span className="text-xs sm:text-sm text-gray-500">
                              {formatCurrency(item.price)}/{item.period}
                            </span>
                          </div>
                        </div>

                        {/* Remove Button - Top Right */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>

                      {/* Quantity Controls and Total - Bottom Row on Mobile */}
                      <div className="flex items-center justify-between w-full sm:w-auto sm:gap-6">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            onClick={() => handleQuantityChange(item.id, -1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                          <span className="w-8 sm:w-12 text-center font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, 1)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                        </div>

                        {/* Item Total */}
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                            {formatCurrency(item.price * item.quantity)}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">
                            /{item.period}
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
                Order Summary
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>
                    Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
                  </span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax</span>
                  <span>{formatCurrency(totalAmount * 0.07)}</span>
                </div>
                <hr className="border-gray-200 dark:border-gray-700" />
                <div className="flex justify-between text-lg font-semibold text-gray-900 dark:text-gray-100">
                  <span>Total</span>
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
                    Payment Method
                  </h2>
                  <button
                    onClick={() => setShowPaymentForm(true)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    Add New
                  </button>
                </div>

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

                {/* Add Payment Method Form */}
                {showPaymentForm && (
                  <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      Add Credit Card
                    </h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Card Number"
                        value={newPaymentMethod.details.cardNumber}
                        onChange={(e) =>
                          setNewPaymentMethod((prev) => ({
                            ...prev,
                            details: {
                              ...prev.details,
                              cardNumber: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={newPaymentMethod.details.expiryDate}
                          onChange={(e) =>
                            setNewPaymentMethod((prev) => ({
                              ...prev,
                              details: {
                                ...prev.details,
                                expiryDate: e.target.value,
                              },
                            }))
                          }
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        />
                        <input
                          type="text"
                          placeholder="CVV"
                          value={newPaymentMethod.details.cvv}
                          onChange={(e) =>
                            setNewPaymentMethod((prev) => ({
                              ...prev,
                              details: { ...prev.details, cvv: e.target.value },
                            }))
                          }
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Cardholder Name"
                        value={newPaymentMethod.details.cardholderName}
                        onChange={(e) =>
                          setNewPaymentMethod((prev) => ({
                            ...prev,
                            details: {
                              ...prev.details,
                              cardholderName: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddPaymentMethod}
                          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Add Card
                        </button>
                        <button
                          onClick={() => setShowPaymentForm(false)}
                          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Checkout Button */}
                <div className="mt-6">
                  {checkoutError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-800 dark:text-red-300">
                        {checkoutError}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={isCheckingOut || !selectedPaymentMethod}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    {isCheckingOut ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Secure Checkout
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-500">
                    <Lock className="w-4 h-4" />
                    <span>Secured by SSL encryption</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
