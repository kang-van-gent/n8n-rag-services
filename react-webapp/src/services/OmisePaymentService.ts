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
      createSource(
        type: string,
        data: any,
        callback: (statusCode: number, response: any) => void
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
  omise_payment_method_id?: string; // Optional for internet banking
  type?: string; // 'credit_card' or 'internet_banking'
  brand: string;
  last_four_digits: string;
  expiry_month?: number; // Optional for internet banking
  expiry_year?: number; // Optional for internet banking
  cardholder_name?: string; // Optional for internet banking
  bank_code?: string; // For internet banking
  bank_name?: string; // For internet banking
  is_default: boolean;
  created_at: string;
  updated_at?: string;
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
    }
    
    if (!publicKey) {
      throw new Error('Omise public key is required');
    }
    
    // Load Omise.js script if not already loaded
    if (!window.Omise) {
      const script = document.createElement('script');
      script.src = 'https://cdn.omise.co/omise.js';
      script.onload = () => {
        if (publicKey) {
          window.Omise.setPublicKey(publicKey);
          this.isInitialized = true;
        }
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
        throw new Error('Failed to create billing profile');
      }

      return newProfile;
    } catch (error) {
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

      // Create token with Omise.js
      window.Omise.createToken('card', cardData, async (statusCode: number, response: TokenResponse) => {
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

          await this.getOrCreateBillingProfile(userId, user.user.email);

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

            // Save payment method to Supabase
            const { data: newMethod, error } = await supabase
              .from('user_payment_methods')
              .insert(paymentMethodData)
              .select()
              .single();

            if (error) {
              reject(new Error('Failed to save payment method'));
              return;
            }

            resolve(newMethod);

          } catch (customerError) {
            reject(new Error('Failed to create customer and save payment method'));
            return;
          }
        } catch (error) {
          reject(new Error('Failed to process payment method'));
        }
      });
    });
  }

  // Create internet banking payment method (saves bank preference)
  static async createInternetBankingMethod(
    userId: string, 
    bankCode: string, 
    bankName: string, 
    isDefault: boolean = false
  ): Promise<OmisePaymentMethod> {
    try {
      // Create a payment method record for internet banking preference
      // TEMPORARY: Using existing schema fields until database migration is run
      const paymentMethodData = {
        user_id: userId,
        omise_payment_method_id: `internet_banking_${bankCode}_${Date.now()}`, // Unique identifier
        brand: bankCode.toUpperCase(),
        last_four_digits: 'BANK', // Identifier for internet banking
        expiry_month: 0, // Use 0 to indicate internet banking
        expiry_year: 0,
        cardholder_name: bankName, // Store bank name in cardholder_name field temporarily
        is_default: isDefault,
      };

      // If this is set as default, clear other defaults first
      if (isDefault) {
        await supabase
          .from('user_payment_methods')
          .update({ is_default: false })
          .eq('user_id', userId);
      }

      const { data: newMethod, error } = await supabase
        .from('user_payment_methods')
        .insert([paymentMethodData])
        .select()
        .single();

      if (error) {
        throw new Error('Failed to save internet banking preference');
      }

      return newMethod;
    } catch (error) {
      throw new Error('Failed to create internet banking method');
    }
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
        return [];
      }

      return data || [];
    } catch (error) {
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
        throw new Error('Failed to delete payment method');
      }
    } catch (error) {
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
        throw new Error('Failed to set default payment method');
      }
    } catch (error) {
      throw error;
    }
  }

  // Process payment with real Omise charge
  static async processPayment(
    userId: string,
    amount: number,
    currency: string,
    description: string,
    paymentMethodId: string,
    isSubscriptionPayment: boolean = false,
    options?: { returnUri?: string; failureUri?: string; orderType?: string; items?: any[] }
  ): Promise<{ success: boolean; orderId?: string; chargeId?: string; redirectUrl?: string; error?: string }> {
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

      // Check if this is an internet banking method (saved bank preference)
      const isInternetBanking = paymentMethod.expiry_month === 0 && paymentMethod.last_four_digits === 'BANK';
      
  if (isInternetBanking) {
        // For saved internet banking methods, redirect to create a new internet banking payment
        console.log('Processing saved internet banking method:', paymentMethod);
        
        // Extract bank code from the brand (stored as bank code)
        const bankCode = paymentMethod.brand?.toLowerCase();
        if (!bankCode) {
          return { success: false, error: 'Invalid bank information' };
        }

  // Use the internet banking payment flow; prefer proxy endpoints so server can determine success/failed
  const appBase = typeof window !== 'undefined' ? window.location.origin : '';
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const proxyUrl = process.env.REACT_APP_OMISE_PROXY_URL || 'http://localhost:3001';
  const defaultReturn = `${proxyUrl}/api/payment-return?redirect=${encodeURIComponent(`${appBase}${currentPath}`)}`;
  const defaultFailure = `${proxyUrl}/api/payment-failure?redirect=${encodeURIComponent(`${appBase}${currentPath}`)}`;
        const returnUri = options?.returnUri || defaultReturn;
        const failureUri = options?.failureUri || defaultFailure;

        return await this.processInternetBankingPayment(
          userId,
          amount,
          currency,
          description,
          bankCode,
          returnUri,
          failureUri,
          undefined, // items
          isSubscriptionPayment, // pass the subscription payment flag
          options?.orderType
        );
      }

      // Initialize Omise if needed for credit card payments
      await this.initialize();

      if (!window.Omise) {
        return { success: false, error: 'Omise SDK not available' };
      }

  let order = null;
      
      // Only create payment order for non-subscription payments
      if (!isSubscriptionPayment) {
        // Create initial payment order record with pending status
        // Use provided items (e.g., from Cart) so we store feature names pre-payment
        const orderItems = options?.items && Array.isArray(options.items) && options.items.length > 0
          ? options.items
          : [{
              id: `card_${Date.now()}`,
              feature: {
                key: 'credit_card_payment',
                name: description || 'Cart purchase',
                description: description || 'Cart purchase',
                category: 'payment',
              },
              price: amount,
              period: 'one_time',
              quantity: 1,
            }];
        const { data: orderData, error: orderError } = await supabase
          .from('payment_orders')
          .insert({
            user_id: userId,
            items: orderItems,
            total_amount: amount,
            currency: currency,
            description: description || 'Cart purchase',
            payment_method: paymentMethod.brand || 'credit_card',
            status: 'pending',
          })
          .select()
          .single();

        if (orderError) {
          console.error('Error creating payment order:', orderError);
          return { success: false, error: 'Failed to create payment order' };
        }
        
        order = orderData;
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
          order_id: order?.id || 'subscription_payment',
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
          
          // Only update payment order if one was created (non-subscription payments)
          if (order) {
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
          } else {
            console.log('🔄 Subscription payment - no payment order to update');
          }

          return {
            success: true,
            orderId: order?.id,
            chargeId: result.id, // Real Omise charge ID
          };
        } else {
          // Charge failed
          console.error('❌ Omise charge failed:', result);
          const errorMessage = result.message || 'Payment processing failed';

          // Update payment order with failed status (only if order exists)
          if (order) {
            const { error: updateError } = await supabase
              .from('payment_orders')
              .update({
                status: 'failed',
              })
              .eq('id', order.id);

            if (updateError) {
              console.error('Error updating payment order:', updateError);
            }
          }

          return {
            success: false,
            error: errorMessage,
          };
        }
      } catch (apiError) {
        console.error('Error calling Omise API:', apiError);
        
        // Update payment order with failed status (only if order exists)
        if (order) {
          const { error: updateError } = await supabase
            .from('payment_orders')
            .update({
              status: 'failed',
            })
            .eq('id', order.id);

          if (updateError) {
            console.error('Error updating payment order:', updateError);
          }
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

  /**
   * Process internet banking payment with Omise
   */
  static async processInternetBankingPayment(
    userId: string,
    amount: number,
    currency: string,
    description: string,
    bankCode: string,
    returnUri: string,
    failureUri: string,
    items?: any[],
    isSubscriptionPayment: boolean = false,
    orderType?: string
  ): Promise<{ success: boolean; orderId?: string; chargeId?: string; redirectUrl?: string; error?: string }> {
    try {
      // Initialize Omise if needed
      await this.initialize();

      let order = null;

      // Only create payment order for non-subscription payments
      if (!isSubscriptionPayment) {
        // Create initial payment order record with pending status
        // Ensure we always have a valid items array
        const orderItems = items && Array.isArray(items) && items.length > 0 
          ? items 
          : [{ 
              id: `ib_${Date.now()}`,
              feature: {
                key: 'internet_banking_payment',
                name: description || 'Internet Banking Payment',
                description: description || 'Cart purchase',
                category: 'payment',
              },
              price: amount,
              period: 'one_time',
              quantity: 1
            }];

        // CRITICAL: Ensure items are JSON-serializable and never null
        let safeItems;
        try {
          // Convert to JSON and back to ensure it's serializable
          const itemsToInsert = orderItems || [{ 
            type: 'internet_banking_fallback', 
            description: description || 'Cart purchase', 
            amount: amount,
            id: `safe_${Date.now()}`,
            name: 'Internet Banking Payment',
            quantity: 1
          }];
          
          // Test JSON serialization
          const jsonTest = JSON.stringify(itemsToInsert);
          safeItems = JSON.parse(jsonTest);
          
          console.log('DEBUG - JSON serialization test passed');
          console.log('DEBUG - safeItems after serialization:', safeItems);
          
        } catch (error) {
          console.error('JSON serialization error:', error);
          safeItems = [{ 
            type: 'json_error_fallback', 
            description: 'Fallback due to serialization error', 
            amount: amount,
            id: `error_${Date.now()}`,
            name: 'Payment',
            quantity: 1
          }];
        }

        console.log('DEBUG - About to insert payment order with:');
        console.log('- user_id:', userId);
        console.log('- items:', safeItems);
        console.log('- items type:', typeof safeItems);
        console.log('- items JSON:', JSON.stringify(safeItems));

        const insertData = {
          user_id: userId,
          items: safeItems,
          total_amount: amount,
          currency: currency,
          description: description || 'Cart purchase',
          payment_method: `internet_banking_${bankCode}`,
          status: 'pending',
        };

        console.log('DEBUG - Final insert data:', insertData);

        const { data: orderData, error: orderError } = await supabase
          .from('payment_orders')
          .insert(insertData)
          .select()
          .single();

        if (orderError) {
          console.error('Error creating payment order:', orderError);
          return { success: false, error: 'Failed to create payment order' };
        }

        order = orderData;
      } else {
        console.log('Skipping payment order creation for subscription payment');
      }

      // Create source for mobile banking - using correct Omise bank codes
      const bankTypeMap: Record<string, string> = {
        'bbl': 'mobile_banking_bbl',
        'kbank': 'mobile_banking_kbank', 
        'ktb': 'mobile_banking_ktb',
        'scb': 'mobile_banking_scb',
        'tmb': 'mobile_banking_scb', // TMB not listed, using SCB as fallback
        'bay': 'mobile_banking_bay'
      };

      const omiseBankType = bankTypeMap[bankCode];
      if (!omiseBankType) {
        return { success: false, error: `Unsupported bank: ${bankCode}` };
      }

      const sourceData = {
        type: omiseBankType,
        amount: Math.round(amount * 100), // Convert to satang
        currency: currency.toLowerCase(),
      };

      console.log('Creating Omise source for internet banking...', sourceData);

      // Call proxy server to create source and charge
      const proxyUrl = process.env.REACT_APP_OMISE_PROXY_URL || 'http://localhost:3001';
      const response = await fetch(`${proxyUrl}/api/internet-banking-charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: sourceData,
          amount: Math.round(amount * 100),
          currency: currency.toLowerCase(),
          description: description || 'Cart purchase',
          return_uri: returnUri,
          failure_uri: failureUri,
          metadata: {
            ...(order ? { order_id: order.id } : {}),
            user_id: userId,
            is_subscription_payment: isSubscriptionPayment,
            ...(orderType ? { order_type: orderType } : {}),
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Update order status to failed only if order exists
        if (order) {
          await supabase
            .from('payment_orders')
            .update({ status: 'failed' })
            .eq('id', order.id);
        }

        return {
          success: false,
          error: result.error || 'Failed to create internet banking charge',
        };
      }

      // Update order with charge ID only if order exists
      if (order) {
        await supabase
          .from('payment_orders')
          .update({
            status: 'processing', // Internet banking payments need user to complete on bank site
            charge_id: result.charge?.id,
          })
          .eq('id', order.id);
      }

      return {
        success: true,
        orderId: order?.id,
        chargeId: result.charge?.id,
        redirectUrl: result.charge?.authorize_uri, // URL to redirect user to bank
      };

    } catch (error) {
      console.error('Error processing internet banking payment:', error);
      return { success: false, error: 'Internet banking payment processing failed' };
    }
  }

  // Convert to cart payment method format
  static convertToCartPaymentMethod(omiseMethod: OmisePaymentMethod): any {
    // Detect internet banking methods (temporary logic for current schema)
    const isInternetBanking = omiseMethod.expiry_month === 0 && omiseMethod.last_four_digits === 'BANK';
    
    if (isInternetBanking || omiseMethod.type === 'internet_banking') {
      // Handle internet banking methods
      return {
        id: omiseMethod.id,
        type: 'internet_banking' as const,
        displayName: omiseMethod.cardholder_name || `${omiseMethod.brand} Mobile Banking`,
        details: {
          bankCode: omiseMethod.brand?.toLowerCase(),
          bankName: omiseMethod.cardholder_name,
        },
        isDefault: omiseMethod.is_default,
        createdAt: omiseMethod.created_at,
        bank_code: omiseMethod.brand?.toLowerCase(),
        bank_name: omiseMethod.cardholder_name,
      };
    } else {
      // Handle credit card methods
      return {
        id: omiseMethod.id,
        type: 'credit_card' as const,
        displayName: `${omiseMethod.brand} ****${omiseMethod.last_four_digits}`,
        details: {
          cardNumber: omiseMethod.last_four_digits,
          expiryDate: omiseMethod.expiry_month && omiseMethod.expiry_year 
            ? `${omiseMethod.expiry_month.toString().padStart(2, '0')}/${omiseMethod.expiry_year.toString().slice(-2)}`
            : '',
          cardholderName: omiseMethod.cardholder_name || '',
        },
        isDefault: omiseMethod.is_default,
        createdAt: omiseMethod.created_at,
      };
    }
  }

  // Internet Banking with Omise Source (Direct Bank Selection)
  static async processInternetBankingWithModal(
    userId: string,
    amount: number,
    currency: string,
    description: string,
    items?: any[]
  ): Promise<{ success: boolean; orderId?: string; chargeId?: string; redirectUrl?: string; error?: string }> {
    return new Promise(async (resolve) => {
      try {
        // Show a simple bank selection modal
        const selectedBank = await this.showBankSelectionModal();
        
        if (!selectedBank) {
          resolve({
            success: false,
            error: 'No bank selected',
          });
          return;
        }

        // Create internet banking source using our existing method
        // (this method will create the payment order with proper items)
        // Redirect via proxy so server determines success/failed, but return back to current page
        const appBase = typeof window !== 'undefined' ? window.location.origin : '';
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const proxyUrl = process.env.REACT_APP_OMISE_PROXY_URL || 'http://localhost:3001';
        const result = await this.processInternetBankingPayment(
          userId,
          amount,
          currency,
          description,
          selectedBank,
          `${proxyUrl}/api/payment-return?redirect=${encodeURIComponent(`${appBase}${currentPath}`)}`,
          `${proxyUrl}/api/payment-failure?redirect=${encodeURIComponent(`${appBase}${currentPath}`)}`,
          items,
          false,
          'cart_addons'
        );

        resolve(result);
      } catch (error) {
        console.error('Error processing internet banking payment:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Payment processing failed',
        });
      }
    });
  }

  // Show bank selection modal using React component
  static async showBankSelectionModal(): Promise<string | null> {
    // Dynamically import the service to avoid circular dependencies
    const { BankModalService } = await import('./BankModalService');
    return BankModalService.showBankSelection();
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