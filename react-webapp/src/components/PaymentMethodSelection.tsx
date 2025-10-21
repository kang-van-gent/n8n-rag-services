import React, { useState, useEffect } from "react";
import { X, CreditCard, Building2 } from "lucide-react";
import {
  OmisePaymentService,
  OmisePaymentMethod,
} from "../services/OmisePaymentService";

// Thai banks for internet banking
const THAI_BANKS = [
  { code: "bbl", name: "Bangkok Bank", logo: "🏦" },
  { code: "kbank", name: "Kasikorn Bank", logo: "🏦" },
  { code: "ktb", name: "Krung Thai Bank", logo: "🏦" },
  { code: "scb", name: "Siam Commercial Bank", logo: "🏦" },
  { code: "bay", name: "Krungsri Bank", logo: "🏦" },
  { code: "tmb", name: "TMB Thanachart Bank", logo: "🏦" },
];

interface NewPaymentFormProps {
  userId: string;
  amount: number;
  currency: string;
  description: string;
  preferredType?: "card" | "internet_banking";
  isSubscriptionPayment?: boolean;
  onPaymentSuccess: (result: {
    success: boolean;
    chargeId?: string;
    orderId?: string;
    redirectUrl?: string;
    error?: string;
  }) => void;
  onPaymentError: (error: string) => void;
  processing: boolean;
  setProcessing: (processing: boolean) => void;
}

const NewPaymentForm: React.FC<NewPaymentFormProps> = ({
  userId,
  amount,
  currency,
  description,
  preferredType,
  isSubscriptionPayment = false,
  onPaymentSuccess,
  onPaymentError,
  processing,
  setProcessing,
}) => {
  const [paymentType, setPaymentType] = useState<"card" | "internet_banking">(
    preferredType || "internet_banking"
  );
  const [selectedBank, setSelectedBank] = useState("");

  const handleInternetBankingPayment = async () => {
    if (!selectedBank) {
      onPaymentError("Please select a bank");
      return;
    }

    setProcessing(true);
    try {
      // Use proxy server URLs for consistent status detection (same as saved methods)
      const proxyUrl =
        process.env.REACT_APP_OMISE_PROXY_URL || "http://localhost:3001";
      const returnUri = `${proxyUrl}/api/payment-return`;
      const failureUri = `${proxyUrl}/api/payment-failure`;

      const result = await OmisePaymentService.processInternetBankingPayment(
        userId,
        amount,
        currency,
        description,
        selectedBank,
        returnUri,
        failureUri,
        undefined, // items
        isSubscriptionPayment
      );

      onPaymentSuccess(result);
    } catch (error) {
      onPaymentError(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Payment Method
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentType("internet_banking")}
            className={`p-3 border rounded-lg flex items-center justify-center space-x-2 transition-colors ${
              paymentType === "internet_banking"
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span className="font-medium">Internet Banking</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentType("card")}
            className={`p-3 border rounded-lg flex items-center justify-center space-x-2 transition-colors ${
              paymentType === "card"
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="font-medium">Credit Card</span>
          </button>
        </div>
      </div>

      {paymentType === "internet_banking" ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select Your Bank
          </label>
          <div className="grid grid-cols-1 gap-2">
            {THAI_BANKS.map((bank) => (
              <label
                key={bank.code}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedBank === bank.code
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <input
                  type="radio"
                  name="bank"
                  value={bank.code}
                  checked={selectedBank === bank.code}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="sr-only"
                />
                <span className="text-2xl mr-3">{bank.logo}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {bank.name}
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={handleInternetBankingPayment}
            disabled={!selectedBank || processing}
            className="w-full mt-4 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {processing ? "Processing..." : "Pay with Internet Banking"}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            You will be redirected to your bank's website to complete the
            payment.
          </p>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            Credit card payment coming soon. Please use Internet Banking for
            now.
          </p>
        </div>
      )}
    </div>
  );
};

interface PaymentMethodSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: (result: {
    success: boolean;
    chargeId?: string;
    orderId?: string;
    redirectUrl?: string;
    error?: string;
  }) => void;
  userId: string;
  amount: number;
  currency: string;
  description: string;
  title?: string;
  // Add subscription context for internet banking payments
  isSubscriptionPayment?: boolean;
  subscriptionContext?: {
    planName?: string;
    planType?: string;
    token?: any;
    // Upgrade-specific properties
    isUpgrade?: boolean;
    targetPlan?: string;
    upgradeDetails?: any;
  };
}

export const PaymentMethodSelection: React.FC<PaymentMethodSelectionProps> = ({
  isOpen,
  onClose,
  onPaymentComplete,
  userId,
  amount,
  currency,
  description,
  title = "Payment Method",
  isSubscriptionPayment = false,
  subscriptionContext,
}) => {
  const [paymentMethods, setPaymentMethods] = useState<OmisePaymentMethod[]>(
    []
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [preferredPaymentType, setPreferredPaymentType] = useState<
    "card" | "internet_banking" | null
  >(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods();
    }
  }, [isOpen, userId]);

  const loadPaymentMethods = async () => {
    setLoading(true);
    try {
      const methods = await OmisePaymentService.getUserPaymentMethods(userId);
      setPaymentMethods(methods);

      // Auto-select default payment method if available
      const defaultMethod = methods.find((pm) => pm.is_default);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod.id);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithSavedMethod = async () => {
    if (!selectedPaymentMethod) return;

    setProcessing(true);
    try {
      const result = await OmisePaymentService.processPayment(
        userId,
        amount,
        currency,
        description,
        selectedPaymentMethod,
        isSubscriptionPayment
      );

      // If there's a redirect URL (saved internet banking method), store payment data
      if (result.success && result.redirectUrl) {
        localStorage.setItem(
          "pendingInternetBankingPayment",
          JSON.stringify({
            userId,
            amount,
            currency,
            description,
            chargeId: result.chargeId,
            orderId: result.orderId,
            timestamp: Date.now(),
            isSubscriptionPayment,
            subscriptionContext,
          })
        );

        // Redirect to bank website
        window.location.href = result.redirectUrl;
        return;
      }

      // For non-redirect payments, pass result directly
      onPaymentComplete(result);
    } catch (error) {
      onPaymentComplete({
        success: false,
        error: error instanceof Error ? error.message : "Payment failed",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleNewPaymentSuccess = (result: {
    success: boolean;
    chargeId?: string;
    orderId?: string;
    redirectUrl?: string;
    error?: string;
  }) => {
    // If there's a redirect URL (internet banking), store payment data before redirecting
    if (result.success && result.redirectUrl) {
      // Store payment information for return handling
      localStorage.setItem(
        "pendingInternetBankingPayment",
        JSON.stringify({
          userId,
          amount,
          currency,
          description,
          chargeId: result.chargeId,
          orderId: result.orderId,
          timestamp: Date.now(),
          isSubscriptionPayment,
          subscriptionContext,
        })
      );

      // Redirect to bank website
      window.location.href = result.redirectUrl;
      return;
    }

    // For non-redirect payments, pass result directly
    onPaymentComplete(result);
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "THB") {
      return `฿${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Amount to Pay:
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(amount, currency)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Loading payment methods...
            </p>
          </div>
        ) : showNewPayment ? (
          <div>
            <button
              onClick={() => {
                setShowNewPayment(false);
                setPreferredPaymentType(null);
              }}
              className="mb-4 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-sm font-medium"
            >
              ← Back to payment options
            </button>
            <NewPaymentForm
              userId={userId}
              amount={amount}
              currency={currency}
              description={description}
              preferredType={preferredPaymentType || undefined}
              isSubscriptionPayment={isSubscriptionPayment}
              onPaymentSuccess={handleNewPaymentSuccess}
              onPaymentError={(error: string) =>
                onPaymentComplete({ success: false, error })
              }
              processing={processing}
              setProcessing={setProcessing}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Saved Payment Methods
                </h4>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`block p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPaymentMethod === method.id
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={selectedPaymentMethod === method.id}
                        onChange={(e) =>
                          setSelectedPaymentMethod(e.target.value)
                        }
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {method.type === "internet_banking" ||
                            (method.expiry_month === 0 &&
                              method.last_four_digits === "BANK")
                              ? method.bank_name ||
                                method.cardholder_name ||
                                `${method.brand.toUpperCase()} Banking`
                              : `**** **** **** ${method.last_four_digits}`}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {method.type === "internet_banking" ||
                            (method.expiry_month === 0 &&
                              method.last_four_digits === "BANK")
                              ? `${method.brand.toUpperCase()} Internet Banking`
                              : method.expiry_month && method.expiry_year
                              ? `${method.brand} • Expires ${method.expiry_month}/${method.expiry_year}`
                              : method.brand}
                          </div>
                        </div>
                        {method.is_default && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  onClick={handlePayWithSavedMethod}
                  disabled={!selectedPaymentMethod || processing}
                  className="w-full mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {processing
                    ? "Processing..."
                    : `Pay ${formatCurrency(amount, currency)}`}
                </button>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
                  {paymentMethods.length > 0
                    ? "Or choose payment method"
                    : "Choose payment method"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setPreferredPaymentType("card");
                  setShowNewPayment(true);
                }}
                className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Credit Card
              </button>
              <button
                onClick={() => {
                  setPreferredPaymentType("internet_banking");
                  setShowNewPayment(true);
                }}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                Internet Banking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
