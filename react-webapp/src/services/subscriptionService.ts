import { supabase } from '../lib/supabase';

export interface SubscriptionHistory {
  id: string;
  user_id: string;
  plan_name: string;
  plan_type: 'basic' | 'standard' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'pending' | 'failed';
  amount: number;
  currency: string;
  billing_cycle: 'monthly' | 'yearly';
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  payment_method: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionSummary {
  total_subscriptions: number;
  active_subscription: SubscriptionHistory | null;
  total_spent: number;
  current_streak_months: number;
  first_subscription_date: string | null;
}

export class SubscriptionService {
  /**
   * Create the subscription history table if it doesn't exist
   */
  static async createSubscriptionTable(): Promise<void> {
    const { error } = await supabase.rpc('create_subscription_table');
    if (error) {
      throw error;
    }
  }

  /**
   * Get subscription history for a user
   */
  static async getSubscriptionHistory(userId: string, limit: number = 10): Promise<SubscriptionHistory[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return [];
      }

      return data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get subscription summary for a user
   */
  static async getSubscriptionSummary(userId: string): Promise<SubscriptionSummary> {
    try {
      const { data, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return this.getDefaultSummary();
      }

      const subscriptions = data || [];
      const activeSubscription = subscriptions.find(sub => sub.status === 'active') || null;
      const totalSpent = subscriptions
        .filter(sub => sub.status === 'active' || sub.status === 'expired')
        .reduce((total, sub) => total + sub.amount, 0);

      const firstSubscription = subscriptions[subscriptions.length - 1];
      const currentStreak = this.calculateCurrentStreak(subscriptions);

      return {
        active_subscription: activeSubscription,
        total_subscriptions: subscriptions.length,
        total_spent: totalSpent,
        current_streak_months: currentStreak,
        first_subscription_date: firstSubscription?.started_at || null,
      };
    } catch (error) {
      return this.getDefaultSummary();
    }
  }

  /**
   * Create a new subscription record
   */
  static async createSubscription(subscription: Omit<SubscriptionHistory, 'id' | 'created_at' | 'updated_at'>): Promise<SubscriptionHistory | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_history')
        .insert([subscription])
        .select()
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update subscription status
   */
  static async updateSubscriptionStatus(
    subscriptionId: string, 
    status: SubscriptionHistory['status'],
    cancelledAt?: string
  ): Promise<boolean> {
    try {
      const updateData: any = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (cancelledAt) {
        updateData.cancelled_at = cancelledAt;
      }

      const { error } = await supabase
        .from('subscription_history')
        .update(updateData)
        .eq('id', subscriptionId);

      if (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get active subscription for a user
   */
  static async getActiveSubscription(userId: string): Promise<SubscriptionHistory | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        return null;
      }

      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate current subscription streak in months
   */
  private static calculateCurrentStreak(subscriptions: SubscriptionHistory[]): number {
    if (subscriptions.length === 0) return 0;

    const sortedSubs = subscriptions.sort((a, b) => 
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );

    let streakMonths = 0;
    const now = new Date();

    for (const sub of sortedSubs) {
      const startDate = new Date(sub.started_at);
      const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null;

      if (sub.status === 'active' || (expiresAt && expiresAt > now)) {
        // Calculate months for this subscription
        const monthsDiff = expiresAt ? 
          Math.ceil((expiresAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) : 1;
        streakMonths += monthsDiff;
      } else if (sub.status === 'expired' || sub.status === 'cancelled') {
        // If we hit a gap, break the streak calculation
        break;
      }
    }

    return streakMonths;
  }

  /**
   * Get default summary for error cases
   */
  private static getDefaultSummary(): SubscriptionSummary {
    return {
      total_subscriptions: 0,
      active_subscription: null,
      total_spent: 0,
      current_streak_months: 0,
      first_subscription_date: null,
    };
  }

  /**
   * Format currency for display
   */
  static formatCurrency(amount: number, currency: string = 'THB'): string {
    try {
      return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
      }).format(amount);
    } catch (error) {
      return `${currency} ${amount}`;
    }
  }

  /**
   * Get plan display name
   */
  static getPlanDisplayName(planType: string): string {
    const displayNames: Record<string, string> = {
      basic: 'Basic Plan',
      standard: 'Standard Plan',
      enterprise: 'Enterprise Plan',
    };
    return displayNames[planType.toLowerCase()] || planType;
  }

  /**
   * Get status display info
   */
  static getStatusDisplay(status: SubscriptionHistory['status']): {
    label: string;
    color: string;
    bgColor: string;
  } {
    const statusMap = {
      active: {
        label: 'Active',
        color: 'text-green-800 dark:text-green-300',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
      },
      expired: {
        label: 'Expired',
        color: 'text-red-800 dark:text-red-300',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
      },
      cancelled: {
        label: 'Cancelled',
        color: 'text-orange-800 dark:text-orange-300',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      },
      pending: {
        label: 'Pending',
        color: 'text-yellow-800 dark:text-yellow-300',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      },
      failed: {
        label: 'Failed',
        color: 'text-red-800 dark:text-red-300',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
      },
    };

    return statusMap[status] || statusMap.pending;
  }
}