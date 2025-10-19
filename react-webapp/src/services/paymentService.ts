import { supabase } from '../lib/supabase';
import { TokenService } from './tokenService';
import { CartItem } from '../contexts/CartContext';

export interface PaymentOrder {
  id: string;
  user_id: string;
  items: CartItem[];
  total_amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  completed_at?: string;
}

export class PaymentService {
  /**
   * Process payment and add purchased add-ons to user's token
   */
  static async processPayment(
    userId: string,
    items: CartItem[],
    totalAmount: number,
    paymentMethodId: string
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      // 1. Create order record (let database generate UUID)
      const { data: order, error: orderError } = await supabase
        .from('payment_orders')
        .insert({
          user_id: userId,
          items: items,
          total_amount: totalAmount,
          currency: 'USD',
          payment_method: paymentMethodId,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        return { success: false, error: 'Failed to create order' };
      }

      // 2. Simulate payment processing (replace with real payment gateway)
      const paymentResult = await this.simulatePaymentProcessing(order.id, totalAmount);
      
      if (!paymentResult.success) {
        // Update order status to failed
        await supabase
          .from('payment_orders')
          .update({ status: 'failed' })
          .eq('id', order.id);
        
        return { success: false, error: paymentResult.error || 'Payment failed' };
      }

      // 3. Payment successful - add add-ons to user's token
      const addOnResult = await this.addAddOnsToToken(userId, items);
      
      if (!addOnResult.success) {
        console.error('Failed to add add-ons to token:', addOnResult.error);
        // Note: Payment succeeded but add-on activation failed
        // In production, you might want to handle this differently
      }

      // 4. Update order status to completed
      await supabase
        .from('payment_orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', order.id);

      return { 
        success: true, 
        orderId: order.id
      };

    } catch (error) {
      console.error('Payment processing error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment processing failed' 
      };
    }
  }

  /**
   * Simulate payment processing (replace with real payment gateway integration)
   */
  private static async simulatePaymentProcessing(
    orderId: string, 
    amount: number
  ): Promise<{ success: boolean; error?: string }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate 95% success rate
    const success = Math.random() > 0.05;
    
    if (!success) {
      return { success: false, error: 'Payment gateway declined the transaction' };
    }

    return { success: true };
  }

  /**
   * Add purchased add-ons to user's token
   */
  private static async addAddOnsToToken(
    userId: string, 
    items: CartItem[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user token
      const currentToken = await TokenService.getUserToken(userId);
      
      if (!currentToken) {
        return { success: false, error: 'No active token found for user' };
      }

      // Extract add-on features from cart items
      const newAddOns = items.map(item => ({
        key: item.feature.key,
        name: item.feature.name,
        description: item.feature.description,
        category: item.feature.category,
        price: item.price,
        period: item.period,
        activated_at: new Date().toISOString(),
        expires_at: this.calculateExpiryDate(item.period)
      }));

      // Merge with existing add-ons (avoid duplicates)
      const existingAddOns = currentToken.addons || [];
      const existingKeys = existingAddOns.map((addon: any) => addon.key);
      
      const filteredNewAddOns = newAddOns.filter(addon => 
        !existingKeys.includes(addon.key)
      );

      const updatedAddOns = [...existingAddOns, ...filteredNewAddOns];

      // Update token with new add-ons
      console.log('About to update token with addons:', updatedAddOns);
      
      await TokenService.updateTokenFeatures(userId, {
        addons: updatedAddOns
      });

      console.log('Successfully updated token with new add-ons');
      return { success: true };

    } catch (error) {
      console.error('Error adding add-ons to token:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to activate add-ons' 
      };
    }
  }

  /**
   * Calculate expiry date based on billing period
   */
  private static calculateExpiryDate(period: string): string {
    const now = new Date();
    
    switch (period.toLowerCase()) {
      case 'month':
        now.setMonth(now.getMonth() + 1);
        break;
      case 'year':
        now.setFullYear(now.getFullYear() + 1);
        break;
      default:
        // Default to 1 month
        now.setMonth(now.getMonth() + 1);
    }
    
    return now.toISOString();
  }

  /**
   * Get user's payment orders
   */
  static async getUserOrders(userId: string): Promise<PaymentOrder[]> {
    try {
      const { data, error } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user orders:', error);
      return [];
    }
  }
}