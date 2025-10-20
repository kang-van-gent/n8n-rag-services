import { supabase } from "../lib/supabase";

// Fixed: OmisePaymentService with proxy server for real Omise transactions
// Uses a separate Node.js proxy server to handle Omise API calls (fixes CORS issues)
// The proxy server keeps secret keys secure on the server-side.

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
  user_id: string;
  omise_payment_method_id: string;
  brand: string;
  last_four_digits: string;
  expiry_month: number;
  expiry_year: number;
  cardholder_name: string;
  is_default: boolean;
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

export class OmisePaymentService {
  private static isInitialized = false;

  // Initialize Omise with environment key
  static initialize(): void {
    if (this.isInitialized) return;

    // Try to get the public key from environment variables
    let publicKey = process.env.REACT_APP_OMISE_PUBLIC_KEY;
    
    // Fallback for development - sometimes React doesn't pick up env vars immediately
    if (!publicKey && window.location.hostname === 'localhost') {
      publicKey = 'pkey_test_5nw5dlqajzq9gdwvuba'; // Your test key as fallback
      console.warn('Using fallback Omise public key for development');
    }
    
    if (!publicKey) {
      console.error('REACT_APP_OMISE_PUBLIC_KEY not found in environment variables');
      console.log('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP')));
      throw new Error('Omise public key is required');
    }
    
    console.log('Initializing Omise with public key:', publicKey.substring(0, 10) + '...');
    
    // Load Omise.js script if not already loaded
    if (!window.Omise) {
      const script = document.createElement('script');
      script.src = 'https://cdn.omise.co/omise.js';
      script.onload = () => {
        if (publicKey) {
          window.Omise.setPublicKey(publicKey);
          this.isInitialized = true;
          console.log('Omise.js loaded and initialized');
        }
      };
      document.head.appendChild(script);
    } else {
      window.Omise.setPublicKey(publicKey);
      this.isInitialized = true;
      console.log('Omise.js initialized with existing library');
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
        reject(new Error('Omise.js is not loaded. Please try again.'));
        return;
      }

      // Clean and prepare card data for Omise.js
      const cleanCardNumber = paymentData.cardNumber.replace(/\s/g, '');
      
      // Additional validation for Omise API requirements
      if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
        reject(new Error('Invalid card number length'));
        return;
      }
      
      if (!paymentData.cardholderName.trim()) {
        reject(new Error('Cardholder name is required'));
        return;
      }
      
      if (paymentData.expiryMonth < 1 || paymentData.expiryMonth > 12) {
        reject(new Error('Invalid expiry month'));
        return;
      }
      
      if (paymentData.expiryYear < new Date().getFullYear()) {
        reject(new Error('Invalid expiry year'));
        return;
      }

      const cardData: CardData = {
        number: cleanCardNumber,
        name: paymentData.cardholderName.trim(),
        expiration_month: paymentData.expiryMonth,
        expiration_year: paymentData.expiryYear,
        security_code: paymentData.cvc,
        postal_code: paymentData.postalCode || undefined,
      };

      console.log('Sending card data to Omise:', {
        ...cardData,
        number: cardData.number.substring(0, 6) + '******' + cardData.number.slice(-4),
        security_code: '***'
      });

      // Create token with Omise.js
      window.Omise.createToken('card', cardData, async (statusCode: number, response: TokenResponse) => {
        console.log('Omise response:', { statusCode, response });
        
        if (statusCode !== 200) {
          // Try to extract a more specific error message
          let errorMessage = 'Failed to create payment token. Please check your card details.';
          if (response && typeof response === 'object') {
            if ('message' in response) {
              errorMessage = `Omise error: ${response.message}`;
            } else if ('code' in response) {
              errorMessage = `Omise error code: ${response.code}`;
            }
          }
          console.error('Omise tokenization failed:', { statusCode, response });
          reject(new Error(errorMessage));
          return;
        }

        try {
          // Ensure billing profile exists
          const { data: user } = await supabase.auth.getUser();
          if (!user.user?.email) {
            reject(new Error('User email is required'));
            return;
          }

          console.log('Creating billing profile for user:', userId);
          await this.getOrCreateBillingProfile(userId, user.user.email);
          console.log('Billing profile ready');

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

          // Create Omise customer with the card token (for reusable cards)
          console.log('Creating Omise customer with card token...');
          
          try {
            const customerResponse = await fetch(`${process.env.REACT_APP_OMISE_PROXY_URL || 'http://localhost:3001'}/api/customers`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: `user-${userId}@example.com`, // In production, use real user email
                description: `Customer for user ${userId}`,
                card: response.id // Use the token to create customer with card
              }),
            });

            if (!customerResponse.ok) {
              const customerError = await customerResponse.json();
              throw new Error(`Failed to create customer: ${customerError.message}`);
            }

            const customer = await customerResponse.json();
            const customerCard = customer.cards.data[0]; // Get the first (and only) card
            
            console.log('Omise customer created:', { customerId: customer.id, cardId: customerCard.id });

            // Prepare payment method data for Supabase with customer ID (for charging)
            const paymentMethodData = {
              user_id: userId,
              omise_payment_method_id: customer.id, // Store customer ID instead of card ID (for easier charging)
              brand: brand,
              last_four_digits: customerCard.last_digits,
              expiry_month: customerCard.expiration_month,
              expiry_year: customerCard.expiration_year,
              cardholder_name: customerCard.name,
              is_default: shouldBeDefault,
            };

            console.log('Inserting payment method into Supabase:', paymentMethodData);

            // Save payment method to Supabase
            const { data: newMethod, error } = await supabase
              .from('user_payment_methods')
              .insert(paymentMethodData)
              .select()
              .single();

            if (error) {
              console.error('Error saving payment method:', error);
              console.error('Failed data:', paymentMethodData);
              reject(new Error('Failed to save payment method'));
              return;
            }

            console.log('Successfully saved payment method:', newMethod);
            resolve(newMethod);

          } catch (customerError) {
            console.error('Error creating customer:', customerError);
            reject(new Error('Failed to create customer and save payment method'));
            return;
          }
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

  // Process payment with real Omise charge
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

      // Initialize Omise if needed
      await this.initialize();

      if (!window.Omise) {
        return { success: false, error: 'Omise SDK not available' };
      }

      // Create initial payment order record with pending status
      const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .insert({
          user_id: userId,
          total_amount: amount,
          currency: currency,
          payment_method: paymentMethod.brand || 'credit card',
          items: { description: description || 'Cart purchase' },
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating payment order:', orderError);
        return { success: false, error: 'Failed to create payment order' };
      }

      console.log('Creating Omise charge with card token...', {
        amount: amount * 100, // Omise expects amount in smallest currency unit (satang for THB)
        currency: currency.toLowerCase(),
        card: paymentMethod.omise_payment_method_id,
        description: description || 'Cart purchase'
      });

      // Create charge using Omise REST API (for real dashboard transactions)
      // Note: In production, this should be done server-side for security
      const chargeData = {
        amount: amount * 100, // Convert to smallest currency unit (satang for THB)
        currency: currency.toLowerCase(),
        card: paymentMethod.omise_payment_method_id, // Use the stored card token
        description: description || 'Cart purchase from React App',
        metadata: {
          order_id: order.id,
          user_id: userId,
        }
      };

      console.log('Sending charge request to Omise API...', chargeData);

      try {
        // Call our proxy server instead of Omise API directly (fixes CORS issue)
        const proxyUrl = process.env.REACT_APP_OMISE_PROXY_URL || 'http://localhost:3001';
        
        const response = await fetch(`${proxyUrl}/api/charges`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chargeData),
        });

        const result = await response.json();
        console.log('Omise charge API response:', result);
        console.log('🔍 Response details:', { 
          status: response.status, 
          ok: response.ok, 
          resultObject: result.object,
          chargeId: result.id 
        });

        if (response.ok && result.object === 'charge') {
          // Charge created successfully - this will appear in your Omise dashboard!
          console.log('✅ Real Omise charge created successfully:', result.id);
          console.log('💰 Check your Omise dashboard for transaction:', result.id);
          console.log('🔄 Updating payment order status to completed for order:', order.id);

          // Update payment order with success status and real charge ID
          const { error: updateError, data: updatedOrder } = await supabase
            .from('payment_orders')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', order.id)
            .select();

          if (updateError) {
            console.error('❌ Error updating payment order to completed:', updateError);
          } else {
            console.log('✅ Payment order updated successfully:', updatedOrder);
          }

          return {
            success: true,
            orderId: order.id,
            chargeId: result.id, // Real Omise charge ID
          };
        } else {
          // Charge failed
          console.error('❌ Omise charge failed:', result);
          const errorMessage = result.message || 'Payment processing failed';

          // Update payment order with failed status
          const { error: updateError } = await supabase
            .from('payment_orders')
            .update({
              status: 'failed',
            })
            .eq('id', order.id);

          if (updateError) {
            console.error('Error updating payment order:', updateError);
          }

          return {
            success: false,
            error: errorMessage,
          };
        }
      } catch (apiError) {
        console.error('Error calling Omise API:', apiError);
        
        // Update payment order with failed status
        const { error: updateError } = await supabase
          .from('payment_orders')
          .update({
            status: 'failed',
          })
          .eq('id', order.id);

        if (updateError) {
          console.error('Error updating payment order:', updateError);
        }

        return {
          success: false,
          error: 'Failed to connect to payment processor',
        };
      }
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

  // Validate card data (static method for form validation)
  static validateCardData(data: CreatePaymentMethodRequest) {
    return validateCardData(data);
  }

  // Format currency (utility method)
  static formatCurrency(amount: number, currency: string = 'THB'): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100); // Convert from cents
  }
}