import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Feature } from "../services/featureService";
import { TokenFeatureService } from "../services/TokenFeatureService";
import { TokenService } from "../services/tokenService";
import { useAuth } from "./AuthContext";
import { useToken } from "./TokenContext";
import { OmisePaymentService, OmisePaymentMethod } from "../services";
import { supabase } from "../lib/supabase";

export interface CartItem {
  id: string;
  feature: Feature;
  price: number;
  period: string; // 'month' | 'year'
  quantity: number;
}

export interface PaymentMethod {
  id: string;
  type: "credit_card" | "paypal" | "bank_transfer" | "crypto";
  displayName: string;
  details: {
    cardNumber?: string; // Last 4 digits for credit cards
    expiryDate?: string;
    cardholderName?: string;
    paypalEmail?: string;
    bankName?: string;
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

      // Process payment with Omise
      const paymentResult = await OmisePaymentService.processPayment(
        user.id,
        total,
        "THB",
        `Purchase of ${items.length} add-on(s)`,
        selectedPaymentMethod.id
      );

      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error || "Payment failed",
        };
      }

      // Update the order record with cart items
      if (paymentResult.orderId) {
        const { error: updateError } = await supabase
          .from("payment_orders")
          .update({ items: items })
          .eq("id", paymentResult.orderId);

        if (updateError) {
          console.error("Failed to update order with items:", updateError);
        }
      }

      // Add purchased add-ons to user's token
      try {
        await TokenService.addAddonsToToken(user.id, items);
        console.log("✅ Add-ons added to user token:", items);

        // Refresh token context to show new add-ons immediately
        await refreshToken();
        console.log("✅ Token refreshed with new add-ons");
      } catch (error) {
        console.error("Failed to add add-ons to token:", error);
        // Don't fail the entire checkout if token update fails
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
