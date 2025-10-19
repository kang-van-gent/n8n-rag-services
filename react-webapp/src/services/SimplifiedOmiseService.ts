// Simplified Omise service that works with Supabase without requiring a backend server
import { supabase } from "../lib/supabase";

// Global Omise.js interface
declare global {
  interface Window {
    Omise: {
      createToken(
        type: 'card', 
        data: CardData, 
        callback: (statusCode: number, response: TokenResponse) => void
      ): void;
      setPublicKey(key: string): void;
    };
  }
}

// Types for Omise.js tokenization
export interface CardData {
  number: string;
  name: string;
  expiration_month: number;
  expiration_year: number;
  security_code: string;
  postal_code?: string;
}

export interface TokenResponse {
  object: 'token';
  id: string;
  livemode: boolean;
  used: boolean;
  card: {
    object: 'card';
    id: string;
    livemode: boolean;
    brand: string;
    last_digits: string;
    expiration_month: number;
    expiration_year: number;
    fingerprint: string;
    name: string;
    postal_code?: string;
    security_code_check: boolean;
  };
}

export interface OmisePaymentMethod {
  id: string;
  brand: string;
  last_four_digits: string;
  expiry_month: number;
  expiry_year: number;
  cardholder_name: string;
  is_default: boolean;
  omise_card_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentMethodRequest {
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  cvc: string;
  postalCode?: string;
  isDefault: boolean;
}

export interface OmiseBillingProfile {
  id: string;
  user_id: string;
  omise_customer_id: string;
  created_at: string;
  updated_at: string;
}

// Validation utilities
export const validateCardData = (data: CreatePaymentMethodRequest) => {
  const errors: string[] = [];

  // Card number validation
  const cardNumber = data.cardNumber.replace(/\s/g, '');
  if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
    errors.push('Please enter a valid card number');
  }

  // Expiry validation
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  if (!data.expiryMonth || data.expiryMonth < 1 || data.expiryMonth > 12) {
    errors.push('Please enter a valid expiry month');
  }
  
  if (!data.expiryYear || data.expiryYear < currentYear) {
    errors.push('Please enter a valid expiry year');
  } else if (data.expiryYear === currentYear && data.expiryMonth < currentMonth) {
    errors.push('Card has expired');
  }

  // Cardholder name validation
  if (!data.cardholderName || data.cardholderName.trim().length < 2) {
    errors.push('Please enter the cardholder name');
  }

  // CVC validation
  if (!data.cvc || data.cvc.length < 3 || data.cvc.length > 4) {
    errors.push('Please enter a valid CVC');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export class SimplifiedOmiseService {
  private static isInitialized = false;

  // Initialize Omise.js with public key
  static initialize(publicKey: string): void {
    if (this.isInitialized) return;

    // Load Omise.js script if not already loaded
    if (!window.Omise) {
      const script = document.createElement('script');
      script.src = 'https://cdn.omise.co/omise.js';
      script.onload = () => {
        window.Omise.setPublicKey(publicKey);
        this.isInitialized = true;
      };
      document.head.appendChild(script);
    } else {
      window.Omise.setPublicKey(publicKey);
      this.isInitialized = true;
    }
  }

  // Get or create billing profile (Supabase only)
  static async getOrCreateBillingProfile(userId: string, userEmail: string): Promise<OmiseBillingProfile> {
    try {
      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_billing_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching billing profile:', fetchError);
        // Continue to create a new profile
      }

      if (existingProfile) {
        return existingProfile;
      }

      // Create a mock customer ID for development (in production, this would create a real Omise customer)
      const mockCustomerId = `cust_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create new billing profile in Supabase
      const { data: newProfile, error: createError } = await supabase
        .from('user_billing_profiles')
        .insert({
          user_id: userId,
          omise_customer_id: mockCustomerId,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating billing profile:', createError);
        throw new Error('Failed to create billing profile');
      }

      return newProfile;
    } catch (error) {
      console.error('Error in getOrCreateBillingProfile:', error);
      throw new Error('Failed to setup billing profile');
    }
  }

  // Create payment method with Omise.js tokenization
  static async createPaymentMethod(userId: string, paymentData: CreatePaymentMethodRequest): Promise<OmisePaymentMethod> {
    return new Promise((resolve, reject) => {
      // Validate input
      const validation = validateCardData(paymentData);
      if (!validation.isValid) {
        reject(new Error(validation.errors.join(', ')));
        return;
      }

      // Check if Omise is initialized
      if (!window.Omise) {
        reject(new Error('Omise.js is not loaded'));
        return;
      }

      // Prepare card data for Omise.js
      const cardData: CardData = {
        number: paymentData.cardNumber.replace(/\s/g, ''),
        name: paymentData.cardholderName,
        expiration_month: paymentData.expiryMonth,
        expiration_year: paymentData.expiryYear,
        security_code: paymentData.cvc,
        postal_code: paymentData.postalCode || undefined,
      };

      // Create token with Omise.js
      window.Omise.createToken('card', cardData, async (statusCode: number, response: TokenResponse) => {
        if (statusCode !== 200) {
          reject(new Error('Failed to create payment token'));
          return;
        }

        try {
          // Get card brand from number
          const cardNumber = paymentData.cardNumber.replace(/\s/g, '');
          let brand = 'Unknown';
          if (cardNumber.startsWith('4')) brand = 'Visa';
          else if (cardNumber.startsWith('5') || cardNumber.startsWith('2')) brand = 'Mastercard';
          else if (cardNumber.startsWith('3')) brand = 'American Express';

          // If this is the first payment method, make it default
          const { data: existingMethods } = await supabase
            .from('user_payment_methods')
            .select('id')
            .eq('user_id', userId);

          const isFirstMethod = !existingMethods || existingMethods.length === 0;
          const shouldBeDefault = paymentData.isDefault || isFirstMethod;

          // If setting as default, unset other defaults first
          if (shouldBeDefault) {
            await supabase
              .from('user_payment_methods')
              .update({ is_default: false })
              .eq('user_id', userId);
          }

          // Save payment method to Supabase
          const { data: newMethod, error } = await supabase
            .from('user_payment_methods')
            .insert({
              user_id: userId,
              brand: brand,
              last_four_digits: response.card.last_digits,
              expiry_month: response.card.expiration_month,
              expiry_year: response.card.expiration_year,
              cardholder_name: response.card.name,
              is_default: shouldBeDefault,
              omise_card_id: response.card.id, // Store the Omise card ID for future use
            })
            .select()
            .single();

          if (error) {
            console.error('Error saving payment method:', error);
            reject(new Error('Failed to save payment method'));
            return;
          }

          resolve(newMethod);
        } catch (error) {
          console.error('Error processing payment method:', error);
          reject(new Error('Failed to process payment method'));
        }
      });
    });
  }

  // Get user's payment methods
  static async getUserPaymentMethods(userId: string): Promise<OmisePaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from('user_payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment methods:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserPaymentMethods:', error);
      return [];
    }
  }

  // Delete payment method
  static async deletePaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_payment_methods')
        .delete()
        .eq('id', paymentMethodId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting payment method:', error);
        throw new Error('Failed to delete payment method');
      }
    } catch (error) {
      console.error('Error in deletePaymentMethod:', error);
      throw error;
    }
  }

  // Set default payment method
  static async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<void> {
    try {
      // First, unset all other defaults
      await supabase
        .from('user_payment_methods')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Then set the specified method as default
      const { error } = await supabase
        .from('user_payment_methods')
        .update({ is_default: true })
        .eq('id', paymentMethodId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error setting default payment method:', error);
        throw new Error('Failed to set default payment method');
      }
    } catch (error) {
      console.error('Error in setDefaultPaymentMethod:', error);
      throw error;
    }
  }

  // Process payment (mock for development)
  static async processPayment(
    userId: string,
    amount: number,
    currency: string,
    description: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; orderId?: string; chargeId?: string; error?: string }> {
    try {
      // Get the payment method
      const { data: paymentMethod, error: pmError } = await supabase
        .from('user_payment_methods')
        .select('*')
        .eq('id', paymentMethodId)
        .eq('user_id', userId)
        .single();

      if (pmError || !paymentMethod) {
        return { success: false, error: 'Payment method not found' };
      }

      // Create payment order record
      const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .insert({
          user_id: userId,
          amount: amount,
          currency: currency,
          description: description,
          payment_method_id: paymentMethodId,
          status: 'completed', // Mock success for development
          omise_charge_id: `charge_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating payment order:', orderError);
        return { success: false, error: 'Failed to create payment order' };
      }

      // In a real implementation, you would:
      // 1. Create a charge using the Omise API (server-side)
      // 2. Handle the response and update the order status
      // For development, we'll just return success

      return {
        success: true,
        orderId: order.id,
        chargeId: order.omise_charge_id,
      };
    } catch (error) {
      console.error('Error processing payment:', error);
      return { success: false, error: 'Payment processing failed' };
    }
  }

  // Convert to cart payment method format
  static convertToCartPaymentMethod(omiseMethod: OmisePaymentMethod): any {
    return {
      id: omiseMethod.id,
      type: 'credit_card' as const,
      displayName: `${omiseMethod.brand} ****${omiseMethod.last_four_digits}`,
      details: {
        cardNumber: omiseMethod.last_four_digits,
        expiryDate: `${omiseMethod.expiry_month.toString().padStart(2, '0')}/${omiseMethod.expiry_year.toString().slice(-2)}`,
        cardholderName: omiseMethod.cardholder_name,
      },
      isDefault: omiseMethod.is_default,
      createdAt: omiseMethod.created_at,
    };
  }
}