import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Feature } from "../services/featureService";
import { TokenFeatureService } from "../services/TokenFeatureService";
import type { Plan } from "../services/pricingService";
import { TokenService } from "../services/tokenService";
import { useAuth } from "./AuthContext";
import { useToken } from "./TokenContext";
import { OmisePaymentService, OmisePaymentMethod } from "../services";
import { supabase } from "../lib/supabase";
import { composeToken as composeN8nToken } from "../utils/tokenGenerator";
import { SubscriptionService } from "../services/subscriptionService";

export interface CartItem {
  id: string;
  feature: Feature;
  price: number;
  period: string; // 'month' | 'year'
  quantity: number;
}

export interface PaymentMethod {
  id: string;
  type:
    | "credit_card"
    | "paypal"
    | "bank_transfer"
    | "crypto"
    | "internet_banking";
  displayName: string;
  details: {
    cardNumber?: string; // Last 4 digits for credit cards
    expiryDate?: string;
    cardholderName?: string;
    paypalEmail?: string;
    bankName?: string;
    bankCode?: string; // For internet banking
    accountNumber?: string; // Last 4 digits
    cryptoAddress?: string;
  };
  isDefault: boolean;
  createdAt: string;
}

interface CartContextType {
  items: CartItem[];
  totalAmount: number;
  itemCount: number;
  paymentMethods: PaymentMethod[];
  selectedPaymentMethod: PaymentMethod | null;
  isLoadingPaymentMethods: boolean;
  addItem: (feature: Feature, quantity?: number) => void;
  addPlanToCart: (plan: Plan) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  addPaymentMethod: (
    paymentMethod: Omit<PaymentMethod, "id" | "createdAt">
  ) => void;
  removePaymentMethod: (methodId: string) => Promise<void>;
  setDefaultPaymentMethod: (methodId: string) => Promise<void>;
  selectPaymentMethod: (methodId: string) => void;
  loadPaymentMethods: () => Promise<void>;
  checkout: () => Promise<{
    success: boolean;
    orderId?: string;
    chargeId?: string;
    redirectUrl?: string;
    error?: string;
  }>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const { user } = useAuth();
  const { refreshToken } = useToken();
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);

  // Calculate totals
  const totalAmount = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  // Initialize Omise and load payment methods when user is available
  useEffect(() => {
    if (user?.id) {
      OmisePaymentService.initialize();
      loadPaymentMethods();
    }
  }, [user?.id]);

  // Load user's payment methods from database
  const loadPaymentMethods = async () => {
    if (!user?.id) return;

    setIsLoadingPaymentMethods(true);
    try {
      const omisePaymentMethods =
        await OmisePaymentService.getUserPaymentMethods(user.id);
      const cartFormatMethods = omisePaymentMethods.map((method) =>
        OmisePaymentService.convertToCartPaymentMethod(method)
      );

      setPaymentMethods(cartFormatMethods);

      // Set default payment method
      const defaultMethod = cartFormatMethods.find(
        (method) => method.isDefault
      );
      setSelectedPaymentMethod(defaultMethod || cartFormatMethods[0] || null);
    } catch (error) {
      console.error("Error loading payment methods:", error);
      setPaymentMethods([]);
      setSelectedPaymentMethod(null);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCartFromStorage = () => {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart) && parsedCart.length > 0) {
            setItems(parsedCart);
            console.log(
              "Cart loaded from localStorage:",
              parsedCart.length,
              "items"
            );
          }
        } catch (error) {
          console.error("Error loading cart from localStorage:", error);
          // Clear corrupted cart data
          localStorage.removeItem("cart");
        }
      }
    };

    loadCartFromStorage();
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem("cart", JSON.stringify(items));
      console.log("Cart saved to localStorage:", items.length, "items");
    } else {
      // Clear localStorage when cart is empty
      localStorage.removeItem("cart");
    }
  }, [items]);

  const addItem = (feature: Feature, quantity: number = 1) => {
    const pricing = TokenFeatureService.getAddOnPricing();
    const featurePricing = pricing[feature.key];

    if (!featurePricing) {
      console.error("No pricing found for feature:", feature.key);
      return;
    }

    const existingItem = items.find((item) => item.feature.key === feature.key);

    if (existingItem) {
      // Don't add duplicate items - each add-on can only be added once
      console.log(`${feature.name} is already in the cart`);
      return;
    } else {
      // Add new item
      const newItem: CartItem = {
        id: `${feature.key}_${Date.now()}`,
        feature,
        price: parseInt(featurePricing.price),
        period: featurePricing.period,
        quantity,
      };
      setItems((prev) => [...prev, newItem]);
    }
  };

  // Add a subscription plan as a cart item
  const addPlanToCart = (plan: Plan) => {
    const key = `plan_${(plan.key || "").toLowerCase()}`;

    // Prevent duplicates
    const exists = items.some((it) => it.feature.key === key);
    if (exists) {
      console.log(`${plan.name} is already in the cart`);
      return;
    }

    const featureLike: Feature = {
      id: key,
      key,
      name: plan.name,
      description: plan.description || null,
      category: "plan",
      unit: "plan",
      is_metered: false,
      default_limit: null,
      is_deprecated: false,
      created_at: new Date().toISOString(),
    };

    const priceNum = plan.price ? parseFloat(plan.price) : 0;
    const cycle = (plan.billing_cycle || "monthly").toLowerCase();
    const period = cycle === "yearly" ? "year" : "month";

    const newItem: CartItem = {
      id: `${key}_${Date.now()}`,
      feature: featureLike,
      price: priceNum,
      period,
      quantity: 1,
    };

    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const addPaymentMethod = (
    paymentMethod: Omit<PaymentMethod, "id" | "createdAt">
  ) => {
    // Note: This is now handled by OmisePaymentForm component
    // which calls OmisePaymentService.createPaymentMethod directly
    // and then triggers a reload of payment methods
    console.log(
      "addPaymentMethod called - should use OmisePaymentForm instead"
    );
  };

  const removePaymentMethod = async (methodId: string) => {
    if (!user?.id) return;

    try {
      await OmisePaymentService.deletePaymentMethod(user.id, methodId);
      await loadPaymentMethods(); // Reload payment methods
    } catch (error) {
      console.error("Error removing payment method:", error);
      throw error;
    }
  };

  const setDefaultPaymentMethod = async (methodId: string) => {
    if (!user?.id) return;

    try {
      await OmisePaymentService.setDefaultPaymentMethod(user.id, methodId);
      await loadPaymentMethods(); // Reload payment methods
    } catch (error) {
      console.error("Error setting default payment method:", error);
      throw error;
    }
  };

  const selectPaymentMethod = (methodId: string) => {
    const method = paymentMethods.find((m) => m.id === methodId);
    setSelectedPaymentMethod(method || null);
  };

  const checkout = async (): Promise<{
    success: boolean;
    orderId?: string;
    chargeId?: string;
    redirectUrl?: string;
    error?: string;
  }> => {
    try {
      if (items.length === 0) {
        return { success: false, error: "Cart is empty" };
      }

      if (!selectedPaymentMethod) {
        return { success: false, error: "No payment method selected" };
      }

      if (!user?.id) {
        return { success: false, error: "User not authenticated" };
      }

      // Calculate total with tax
      const subtotal = totalAmount;
      const tax = subtotal * 0.07; // 7% tax
      const total = subtotal + tax;

      // Determine order type and subscription context
      const hasPlanItem = items.some(
        (it) =>
          it.feature.category === "plan" || it.feature.key.startsWith("plan_")
      );
      const orderType = hasPlanItem ? "cart_token" : "cart_addons";

      // Process payment with Omise
      let paymentResult: {
        success: boolean;
        orderId?: string;
        chargeId?: string;
        redirectUrl?: string;
        error?: string;
      };

      if (selectedPaymentMethod.type === "internet_banking") {
        // For internet banking, create a charge with source
        const appBase =
          typeof window !== "undefined" ? window.location.origin : "";
        const currentPath = "/cart";
        const proxyUrl =
          process.env.REACT_APP_OMISE_PROXY_URL || "http://localhost:3001";
        paymentResult = await OmisePaymentService.processInternetBankingPayment(
          user.id,
          total,
          "THB",
          `Purchase of ${items.length} add-on(s)`,
          selectedPaymentMethod.details.bankCode || "",
          `${proxyUrl}/api/payment-return?redirect=${encodeURIComponent(
            `${appBase}${currentPath}`
          )}`,
          `${proxyUrl}/api/payment-failure?redirect=${encodeURIComponent(
            `${appBase}${currentPath}`
          )}`,
          items, // Pass cart items to create proper order
          hasPlanItem, // Only treat as subscription when purchasing a plan
          orderType
        );
      } else {
        // For credit cards, use existing flow
        paymentResult = await OmisePaymentService.processPayment(
          user.id,
          total,
          "THB",
          `Purchase of ${items.length} add-on(s)`,
          selectedPaymentMethod.id,
          hasPlanItem, // subscription when plan, not when add-ons only
          { orderType, items }
        );
      }

      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error || "Payment failed",
        };
      }

      // Handle internet banking redirect
      if (paymentResult.redirectUrl) {
        // For internet banking, return redirect information to Cart component
        // Let Cart component handle the redirect (same as handleInternetBankingCheckout)
        return {
          success: true,
          orderId: paymentResult.orderId,
          chargeId: paymentResult.chargeId,
          redirectUrl: paymentResult.redirectUrl,
        };
      }

      // Create token from purchased plan (if any), then add add-ons
      try {
        // Separate plan item and add-on items
        const planItem = items.find(
          (it) =>
            it.feature.category === "plan" || it.feature.key.startsWith("plan_")
        );
        const addOnItems = items.filter(
          (it) =>
            !(
              it.feature.category === "plan" ||
              it.feature.key.startsWith("plan_")
            )
        );

        if (planItem) {
          // Check existing active token to avoid duplicates
          const existing = await TokenService.getUserToken(user.id);
          if (!existing) {
            const planKey = planItem.feature.key.replace(/^plan_/, "");
            const type = planItem.period === "year" ? "yearly" : "monthly";
            const draft = composeN8nToken(planKey, type);
            await TokenService.createToken(user.id, {
              token: draft.token,
              package: draft.package,
              type: draft.type,
              features: draft.features,
              addons: draft.addons,
              expiredAt: draft.expiredAt,
            });

            // Create subscription record instead of order
            await SubscriptionService.createSubscription({
              user_id: user.id,
              plan_name: planItem.feature.name,
              plan_type: planKey as any,
              status: "active",
              amount: planItem.price * planItem.quantity,
              currency: "THB",
              billing_cycle: type as any,
              started_at: new Date().toISOString(),
              expires_at: draft.expiredAt,
              cancelled_at: null,
              payment_method: selectedPaymentMethod?.type || null,
              transaction_id: (paymentResult.orderId ||
                paymentResult.chargeId ||
                null) as any,
            });
          }
        }

        if (addOnItems.length > 0) {
          // For add-ons purchased alone via credit card, payment order is already completed by service
          // For internet banking, mark order as completed now (service set it to processing)
          if (!planItem && paymentResult.orderId) {
            try {
              await supabase
                .from("payment_orders")
                .update({
                  status: "completed",
                  completed_at: new Date().toISOString(),
                })
                .eq("id", paymentResult.orderId);
            } catch (e) {
              console.error("Failed to update payment order to completed:", e);
            }
          }
          await TokenService.addAddonsToToken(user.id, addOnItems);
          console.log("✅ Add-ons added to user token:", addOnItems);
        }

        // Refresh token context to reflect new token/addons
        await refreshToken();
      } catch (error) {
        console.error("Post-payment token creation/add-ons failed:", error);
        // Do not fail the overall checkout return
      }

      // Clear cart on successful checkout
      clearCart();

      return {
        success: true,
        orderId: paymentResult.orderId || paymentResult.chargeId,
      };
    } catch (error) {
      console.error("Checkout error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Checkout failed. Please try again.",
      };
    }
  };

  // Note: Add-ons are now handled via payment orders tracking only
  // No longer automatically adding to token features

  const value: CartContextType = {
    items,
    totalAmount,
    itemCount,
    paymentMethods,
    selectedPaymentMethod,
    isLoadingPaymentMethods,
    addItem,
    addPlanToCart,
    removeItem,
    updateQuantity,
    clearCart,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    selectPaymentMethod,
    loadPaymentMethods,
    checkout,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
