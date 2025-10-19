import { supabase } from '../lib/supabase';

export interface Plan {
  id: string;
  key: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  price?: string; // text field in your schema
  currency?: string;
  billing_cycle?: string;
  features?: any[];
  updated_at?: string;
}

export interface PricingBreakdown {
  basePrice: number;
  addOnPrice: number;
  totalPrice: number;
  currency: string;
  breakdown: Array<{
    type: 'plan' | 'addon';
    name: string;
    key?: string;
    price: number;
    currency: string;
    period: string;
  }>;
}

export class PricingService {
  /**
   * Get all available plans from database
   */
  static async getPlans(): Promise<Plan[]> {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching plans:', error);
      return [];
    }
  }

  /**
   * Get specific plan by key (not name)
   */
  static async getPlanByKey(planKey: string): Promise<Plan | null> {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('key', planKey.toLowerCase())
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching plan:', error);
      return null;
    }
  }

  /**
   * Get specific plan by name (legacy method)
   */
  static async getPlanByName(planName: string): Promise<Plan | null> {
    return this.getPlanByKey(planName); // Use key instead of name
  }

  /**
   * Calculate renewal pricing from token and payment history
   */
  static async calculateRenewalPrice(
    token: any,
    paymentOrders: any[] = []
  ): Promise<PricingBreakdown> {
    if (!token) {
      return {
        basePrice: 0,
        addOnPrice: 0,
        totalPrice: 0,
        currency: 'THB',
        breakdown: []
      };
    }

    try {
      // Get base plan pricing from database
      const plan = await this.getPlanByKey(token.package);
      const basePrice = plan?.price ? parseFloat(plan.price) : 0;
      const currency = plan?.currency || 'THB';

      const breakdown: Array<{
        type: 'plan' | 'addon';
        name: string;
        key?: string;
        price: number;
        currency: string;
        period: string;
      }> = [];

      // Add base plan to breakdown
      if (plan) {
        breakdown.push({
          type: 'plan',
          name: plan.name,
          price: basePrice,
          currency: currency,
          period: plan.billing_cycle || 'monthly'
        });
      }

      // Calculate add-on prices from token.addons
      let addOnPrice = 0;
      if (token.addons && Array.isArray(token.addons)) {
        const processedAddons = new Set(); // Track processed addons to avoid duplicates

        token.addons.forEach((addon: any) => {
          const addonKey = addon.key || addon.feature_key || addon.id;
          
          if (addonKey && !processedAddons.has(addonKey)) {
            processedAddons.add(addonKey);
            
            // Get price from addon object (assuming it's stored there)
            const addonPrice = addon.price || 0;
            const addonCurrency = addon.currency || currency;
            
            if (addonPrice > 0) {
              addOnPrice += addonPrice;
              breakdown.push({
                type: 'addon',
                name: addon.name || addon.feature_name || addonKey.replace(/_/g, ' '),
                key: addonKey,
                price: addonPrice,
                currency: addonCurrency,
                period: addon.period || addon.billing_cycle || 'month'
              });
            }
          }
        });
      }

      return {
        basePrice,
        addOnPrice,
        totalPrice: basePrice + addOnPrice,
        currency,
        breakdown
      };
    } catch (error) {
      console.error('Error calculating renewal price:', error);
      return {
        basePrice: 0,
        addOnPrice: 0,
        totalPrice: 0,
        currency: 'THB',
        breakdown: []
      };
    }
  }

  /**
   * Get add-on pricing from payment orders (fallback method)
   */
  static getAddOnPricingFromOrders(paymentOrders: any[]): Record<string, { price: number; currency: string; period: string }> {
    const addOnPricing: Record<string, { price: number; currency: string; period: string }> = {};
    
    paymentOrders
      .filter(order => order.status === 'completed')
      .forEach(order => {
        order.items?.forEach((item: any) => {
          if (item.feature?.key) {
            addOnPricing[item.feature.key] = {
              price: item.price || 0,
              currency: order.currency || 'THB',
              period: item.period || 'month'
            };
          }
        });
      });

    return addOnPricing;
  }

  /**
   * Format currency amount
   */
  static formatCurrency(amount: number, currency: string = 'THB'): string {
    if (currency === 'THB') {
      return `฿${amount.toLocaleString()}`;
    }
    return `${amount.toLocaleString()} ${currency}`;
  }

  /**
   * Create or update plan in database
   */
  static async createOrUpdatePlan(planData: Omit<Plan, 'id' | 'created_at' | 'updated_at'>): Promise<Plan> {
    try {
      const { data, error } = await supabase
        .from('plans')
        .upsert(planData, { onConflict: 'name' })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating/updating plan:', error);
      throw error;
    }
  }
}