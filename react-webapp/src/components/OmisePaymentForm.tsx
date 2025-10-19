import React, { useState, useEffect } from "react";
import { CreditCard, Lock, X, AlertCircle, Check } from "lucide-react";
import { OmisePaymentService, CreatePaymentMethodRequest } from "../services";
import { cn } from "../utils/cn";

interface OmisePaymentFormProps {
  userId: string;
  onSuccess: (paymentMethod: any) => void;
  onCancel: () => void;
  onError?: (error: string) => void;
  autoSetDefault?: boolean;
}

export function OmisePaymentForm({
  userId,
  onSuccess,
  onCancel,
  onError,
  autoSetDefault = false,
}: OmisePaymentFormProps) {
  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryDate: "", // Display value for MM/YY input
    expiryMonth: "",
    expiryYear: "",
    cardholderName: "",
    cvc: "",
    postalCode: "",
    isDefault: autoSetDefault,
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [omiseReady, setOmiseReady] = useState(false);

  // Check Omise initialization status
  useEffect(() => {
    const checkOmiseReady = () => {
      if (window.Omise) {
        console.log("Omise.js is ready");
        setOmiseReady(true);
      } else {
        console.log("Omise.js not yet loaded, checking again...");
        setTimeout(checkOmiseReady, 500);
      }
    };

    checkOmiseReady();
  }, []);

  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  // Format expiry date MM/YY
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, ""); // Remove all non-digits
    if (v.length === 0) return "";
    if (v.length <= 2) return v;
    return v.substring(0, 2) + "/" + v.substring(2, 4);
  };

  // Get card brand from number
  const getCardBrand = (number: string) => {
    const cleaned = number.replace(/\s/g, "");
    if (cleaned.startsWith("4")) return "Visa";
    if (cleaned.startsWith("5") || cleaned.startsWith("2")) return "Mastercard";
    if (cleaned.startsWith("3")) return "American Express";
    return "Card";
  };

  const handleInputChange = (field: string, value: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    if (field === "cardNumber") {
      value = formatCardNumber(value);
    } else if (field === "expiryDate") {
      value = formatExpiryDate(value);
      // Split MM/YY into separate fields
      const [month, year] = value.split("/");
      setFormData((prev) => ({
        ...prev,
        expiryDate: value, // Store the formatted display value
        expiryMonth: month || "",
        expiryYear: year ? `20${year}` : "",
      }));
      return;
    } else if (field === "cvc") {
      value = value.replace(/[^0-9]/g, "").substring(0, 4);
    } else if (field === "cardholderName") {
      value = value.replace(/[^a-zA-Z\s]/g, "");
    } else if (field === "postalCode") {
      value = value.replace(/[^0-9]/g, "").substring(0, 5);
    }

    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const expiryMonth = parseInt(formData.expiryMonth);
    const expiryYear = parseInt(formData.expiryYear);

    const validation = OmisePaymentService.validateCardData({
      cardNumber: formData.cardNumber,
      expiryMonth,
      expiryYear,
      cardholderName: formData.cardholderName,
      cvc: formData.cvc,
      postalCode: formData.postalCode,
      isDefault: formData.isDefault,
    });

    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      const paymentMethodData: CreatePaymentMethodRequest = {
        cardNumber: formData.cardNumber,
        expiryMonth: parseInt(formData.expiryMonth),
        expiryYear: parseInt(formData.expiryYear),
        cardholderName: formData.cardholderName,
        cvc: formData.cvc,
        postalCode: formData.postalCode,
        isDefault: formData.isDefault,
      };

      const paymentMethod = await OmisePaymentService.createPaymentMethod(
        userId,
        paymentMethodData
      );
      const cartFormatMethod =
        OmisePaymentService.convertToCartPaymentMethod(paymentMethod);

      console.log(
        "Payment method created successfully, calling onSuccess:",
        cartFormatMethod
      );
      onSuccess(cartFormatMethod);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to add payment method";
      setErrors([errorMessage]);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const cardBrand = getCardBrand(formData.cardNumber);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Add Payment Method
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Securely add your card details
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-800 dark:text-red-300">
                  Please fix the following issues:
                </span>
              </div>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Card Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Card Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.cardNumber}
                onChange={(e) =>
                  handleInputChange("cardNumber", e.target.value)
                }
                placeholder="4242 4242 4242 4242 (test card)"
                maxLength={19}
                className={cn(
                  "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 pr-16",
                  touched.cardNumber &&
                    errors.some((e) => e.includes("card number"))
                    ? "border-red-300 dark:border-red-600"
                    : "border-gray-300 dark:border-gray-600"
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                {cardBrand}
              </div>
            </div>
          </div>

          {/* Expiry and CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiry Date
              </label>
              <input
                type="text"
                value={formData.expiryDate}
                onChange={(e) =>
                  handleInputChange("expiryDate", e.target.value)
                }
                placeholder="MM/YY"
                maxLength={5}
                className={cn(
                  "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100",
                  touched.expiryDate && errors.some((e) => e.includes("expiry"))
                    ? "border-red-300 dark:border-red-600"
                    : "border-gray-300 dark:border-gray-600"
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CVC
              </label>
              <input
                type="text"
                value={formData.cvc}
                onChange={(e) => handleInputChange("cvc", e.target.value)}
                placeholder="123"
                maxLength={4}
                className={cn(
                  "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100",
                  touched.cvc && errors.some((e) => e.includes("CVC"))
                    ? "border-red-300 dark:border-red-600"
                    : "border-gray-300 dark:border-gray-600"
                )}
              />
            </div>
          </div>

          {/* Cardholder Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cardholder Name
            </label>
            <input
              type="text"
              value={formData.cardholderName}
              onChange={(e) =>
                handleInputChange("cardholderName", e.target.value)
              }
              placeholder="John Doe"
              className={cn(
                "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100",
                touched.cardholderName && errors.some((e) => e.includes("name"))
                  ? "border-red-300 dark:border-red-600"
                  : "border-gray-300 dark:border-gray-600"
              )}
            />
          </div>

          {/* Postal Code (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Postal Code <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => handleInputChange("postalCode", e.target.value)}
              placeholder="12345"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Set as Default */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isDefault: e.target.checked,
                  }))
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Set as default payment method
              </span>
            </label>
          </div>

          {/* Test Card Notice */}
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div className="text-sm text-yellow-800 dark:text-yellow-300">
              <div className="font-medium">
                Development Mode - Use Test Cards
              </div>
              <div className="mt-1">
                Visa: 4242 4242 4242 4242 | Mastercard: 5555 5555 5555 4444
                <br />
                Use any future date for expiry and any 3-digit CVC
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-sm text-blue-800 dark:text-blue-300">
              Your card details are encrypted and processed securely by Omise
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !omiseReady}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding...
                </>
              ) : !omiseReady ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading Omise...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Add Payment Method
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OmisePaymentForm;
