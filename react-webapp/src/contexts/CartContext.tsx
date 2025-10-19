import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Feature } from "../services/featureService";
import { TokenFeatureService } from "../services/TokenFeatureService";
import { PaymentService } from "../services/paymentService";
import { useAuth } from "./AuthContext";

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
  addItem: (feature: Feature, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  addPaymentMethod: (
    paymentMethod: Omit<PaymentMethod, "id" | "createdAt">
  ) => void;
  removePaymentMethod: (methodId: string) => void;
  setDefaultPaymentMethod: (methodId: string) => void;
  selectPaymentMethod: (methodId: string) => void;
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
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    // Mock payment methods for demonstration
    {
      id: "1",
      type: "credit_card",
      displayName: "Visa ending in 4242",
      details: {
        cardNumber: "4242",
        expiryDate: "12/25",
        cardholderName: "John Doe",
      },
      isDefault: true,
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "2",
      type: "paypal",
      displayName: "PayPal Account",
      details: {
        paypalEmail: "john.doe@example.com",
      },
      isDefault: false,
      createdAt: "2024-01-15T00:00:00Z",
    },
  ]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(
      paymentMethods.find((method) => method.isDefault) || null
    );

  // Calculate totals
  const totalAmount = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error("Error loading cart from localStorage:", error);
      }
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
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
    const newMethod: PaymentMethod = {
      ...paymentMethod,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    setPaymentMethods((prev) => [...prev, newMethod]);
  };

  const removePaymentMethod = (methodId: string) => {
    setPaymentMethods((prev) => {
      const updated = prev.filter((method) => method.id !== methodId);

      // If removed method was selected, select default or first available
      if (selectedPaymentMethod?.id === methodId) {
        const defaultMethod = updated.find((method) => method.isDefault);
        setSelectedPaymentMethod(defaultMethod || updated[0] || null);
      }

      return updated;
    });
  };

  const setDefaultPaymentMethod = (methodId: string) => {
    setPaymentMethods((prev) =>
      prev.map((method) => ({
        ...method,
        isDefault: method.id === methodId,
      }))
    );

    const method = paymentMethods.find((m) => m.id === methodId);
    if (method) {
      setSelectedPaymentMethod(method);
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

      // Process payment and add add-ons to user's token
      const result = await PaymentService.processPayment(
        user.id,
        items,
        totalAmount,
        selectedPaymentMethod.id
      );

      if (result.success) {
        // Clear cart on successful checkout
        clearCart();
      }

      return result;
    } catch (error) {
      console.error("Checkout error:", error);
      return { success: false, error: "Checkout failed. Please try again." };
    }
  };

  const value: CartContextType = {
    items,
    totalAmount,
    itemCount,
    paymentMethods,
    selectedPaymentMethod,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    selectPaymentMethod,
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
