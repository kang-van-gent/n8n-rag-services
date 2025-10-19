import React, { useState, useEffect } from "react";
import { CreditCard, Lock, AlertCircle, CheckCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import OmiseService, {
  CardData,
  TokenResponse,
  PaymentMethod,
} from "../services/OmiseService";
import { cn } from "../utils/cn";

interface PaymentFormProps {
  onSuccess?: (paymentMethod: PaymentMethod) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  customerId?: string;
  amount?: number;
  currency?: string;
  description?: string;
  submitText?: string;
  showHeader?: boolean;
  className?: string;
}

export function PaymentForm({
  onSuccess,
  onError,
  onCancel,
  customerId,
  amount,
  currency = "THB",
  description,
  submitText,
  showHeader = true,
  className,
}: PaymentFormProps) {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cardData, setCardData] = useState<CardData>({
    number: "",
    name: "",
    expiration_month: 1,
    expiration_year: new Date().getFullYear(),
    security_code: "",
    postal_code: "",
  });

  // Initialize Omise.js
  useEffect(() => {
    const publicKey = process.env.REACT_APP_OMISE_PUBLIC_KEY;
    if (publicKey) {
      OmiseService.initialize(publicKey);
    } else {
      console.error(
        "Omise public key not found. Please set REACT_APP_OMISE_PUBLIC_KEY in your environment."
      );
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Card number validation
    if (!OmiseService.validateCardNumber(cardData.number)) {
      newErrors.number = t("payment.errors.invalidCardNumber");
    }

    // Cardholder name validation
    if (!cardData.name.trim()) {
      newErrors.name = t("payment.errors.nameRequired");
    }

    // Expiry date validation
    if (
      !OmiseService.validateExpiryDate(
        cardData.expiration_month,
        cardData.expiration_year
      )
    ) {
      newErrors.expiry = t("payment.errors.invalidExpiryDate");
    }

    // CVC validation
    if (!OmiseService.validateCVC(cardData.security_code)) {
      newErrors.security_code = t("payment.errors.invalidCVC");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    setErrors({});

    try {
      // Create token with Omise.js
      const tokenResponse: TokenResponse = await OmiseService.createCardToken({
        ...cardData,
        number: cardData.number.replace(/\\s/g, ""), // Remove spaces
      });

      if (amount && customerId) {
        // Create payment if amount is provided
        await OmiseService.createPayment({
          amount,
          currency,
          description,
          customer_id: customerId,
          token: tokenResponse.id,
        });
      } else if (customerId) {
        // Add payment method to customer
        const paymentMethod = await OmiseService.addPaymentMethod(
          customerId,
          tokenResponse.id
        );
        onSuccess?.(paymentMethod);
      }

      // Reset form
      setCardData({
        number: "",
        name: "",
        expiration_month: 1,
        expiration_year: new Date().getFullYear(),
        security_code: "",
        postal_code: "",
      });
    } catch (error) {
      console.error("Payment processing error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Payment processing failed";
      setErrors({ general: errorMessage });
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardNumberChange = (value: string) => {
    // Auto-format card number with spaces
    const formatted = OmiseService.formatCardNumber(value);
    setCardData((prev) => ({ ...prev, number: formatted }));

    // Clear error when user starts typing
    if (errors.number) {
      setErrors((prev) => ({ ...prev, number: "" }));
    }
  };

  const handleExpiryChange = (field: "month" | "year", value: string) => {
    const numValue = parseInt(value);
    if (field === "month") {
      setCardData((prev) => ({ ...prev, expiration_month: numValue }));
    } else {
      setCardData((prev) => ({ ...prev, expiration_year: numValue }));
    }

    // Clear expiry error
    if (errors.expiry) {
      setErrors((prev) => ({ ...prev, expiry: "" }));
    }
  };

  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 15; i++) {
      years.push(currentYear + i);
    }
    return years;
  };

  const generateMonths = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700",
        className
      )}
    >
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {amount
                  ? t("payment.makePayment")
                  : t("payment.addPaymentMethod")}
              </h2>
              {amount && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {OmiseService.formatCurrency(amount, currency)}
                </p>
              )}
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Security Notice */}
      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-500/30 mb-6">
        <Lock className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span className="text-sm text-green-800 dark:text-green-300">
          {t("payment.secureNotice")}
        </span>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-500/30 mb-6">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-800 dark:text-red-300">
            {errors.general}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("payment.cardNumber")}
          </label>
          <input
            type="text"
            value={cardData.number}
            onChange={(e) => handleCardNumberChange(e.target.value)}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            className={cn(
              "w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-700 transition-colors",
              "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-gray-100",
              errors.number
                ? "border-red-300 dark:border-red-500"
                : "border-gray-300 dark:border-gray-600"
            )}
            disabled={isProcessing}
          />
          {errors.number && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.number}
            </p>
          )}
        </div>

        {/* Cardholder Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("payment.cardholderName")}
          </label>
          <input
            type="text"
            value={cardData.name}
            onChange={(e) => {
              setCardData((prev) => ({ ...prev, name: e.target.value }));
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            placeholder={t("payment.namePlaceholder")}
            className={cn(
              "w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-700 transition-colors",
              "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-gray-100",
              errors.name
                ? "border-red-300 dark:border-red-500"
                : "border-gray-300 dark:border-gray-600"
            )}
            disabled={isProcessing}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.name}
            </p>
          )}
        </div>

        {/* Expiry Date and CVC */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("payment.expiryMonth")}
            </label>
            <select
              value={cardData.expiration_month}
              onChange={(e) => handleExpiryChange("month", e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-700 transition-colors",
                "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-gray-100",
                errors.expiry
                  ? "border-red-300 dark:border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              )}
              disabled={isProcessing}
            >
              {generateMonths().map((month) => (
                <option key={month} value={month}>
                  {month.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("payment.expiryYear")}
            </label>
            <select
              value={cardData.expiration_year}
              onChange={(e) => handleExpiryChange("year", e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-700 transition-colors",
                "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-gray-100",
                errors.expiry
                  ? "border-red-300 dark:border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              )}
              disabled={isProcessing}
            >
              {generateYears().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("payment.cvc")}
            </label>
            <input
              type="text"
              value={cardData.security_code}
              onChange={(e) => {
                const value = e.target.value.replace(/\\D/g, ""); // Only digits
                setCardData((prev) => ({ ...prev, security_code: value }));
                if (errors.security_code)
                  setErrors((prev) => ({ ...prev, security_code: "" }));
              }}
              placeholder="123"
              maxLength={4}
              className={cn(
                "w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-700 transition-colors",
                "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-gray-100",
                errors.security_code
                  ? "border-red-300 dark:border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              )}
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Show expiry error under the row */}
        {errors.expiry && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.expiry}
          </p>
        )}
        {errors.security_code && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errors.security_code}
          </p>
        )}

        {/* Postal Code (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("payment.postalCode")}{" "}
            <span className="text-gray-400">({t("payment.optional")})</span>
          </label>
          <input
            type="text"
            value={cardData.postal_code}
            onChange={(e) =>
              setCardData((prev) => ({ ...prev, postal_code: e.target.value }))
            }
            placeholder="10110"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-gray-100 transition-colors"
            disabled={isProcessing}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing}
          className={cn(
            "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
            isProcessing
              ? "bg-gray-400 cursor-not-allowed text-white"
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          )}
        >
          {isProcessing ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              {t("payment.processing")}
            </>
          ) : (
            <>
              {amount ? (
                <CreditCard className="w-5 h-5" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              {submitText ||
                (amount ? t("payment.payNow") : t("payment.addCard"))}
            </>
          )}
        </button>
      </form>

      {/* Footer Note */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("payment.poweredBy")} <span className="font-semibold">Omise</span>
        </p>
      </div>
    </div>
  );
}

export default PaymentForm;
