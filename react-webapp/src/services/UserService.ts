import { supabase } from '../lib/supabase';
import { PaymentMethod } from '../contexts/CartContext';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  preferences?: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
}

export interface UserToken {
  id: string;
  user_id: string;
  token: string;
  package: string;
  status: string;
  created_at: string;
  expiredAt: string | null;
  features: any[];
  addons: any[];
  type: string;
}

export interface UserPayment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_method: string;
  description: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export interface UserWithDetails extends UserProfile {
  token: UserToken | null;
  paymentMethods: PaymentMethod[];
  recentPayments: UserPayment[];
  totalSpent: number;
  accountAge: number; // in days
}

export class UserService {
  /**
   * Get all users with their details
   */
  static async getAllUsers(): Promise<UserWithDetails[]> {
    try {
      // Get all user profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      const usersWithDetails: UserWithDetails[] = [];

      for (const profile of profiles || []) {
        // Get user token
        const { data: token } = await supabase
          .from('tokens')
          .select('*')
          .eq('user_id', profile.id)
          .eq('status', 'active')
          .single();

        // Get user payments (mock data for now)
        const recentPayments: UserPayment[] = [
          {
            id: `payment_${profile.id}_1`,
            user_id: profile.id,
            amount: token?.package === 'basic' ? 29 : token?.package === 'standard' ? 59 : 199,
            currency: 'USD',
            status: 'completed',
            payment_method: 'credit_card',
            description: `${token?.package || 'basic'} plan subscription`,
            created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }
        ];

        // Mock payment methods
        const paymentMethods: PaymentMethod[] = [
          {
            id: `pm_${profile.id}_1`,
            type: 'credit_card',
            displayName: 'Visa ending in 4242',
            details: {
              cardNumber: '4242',
              expiryDate: '12/25',
              cardholderName: profile.name || 'Unknown'
            },
            isDefault: true,
            createdAt: profile.created_at
          }
        ];

        const totalSpent = recentPayments.reduce((sum, payment) => 
          payment.status === 'completed' ? sum + payment.amount : sum, 0
        );

        const accountAge = Math.floor(
          (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        usersWithDetails.push({
          ...profile,
          token: token || null,
          paymentMethods,
          recentPayments,
          totalSpent,
          accountAge
        });
      }

      return usersWithDetails;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user by ID with details
   */
  static async getUserById(userId: string): Promise<UserWithDetails | null> {
    try {
      const users = await this.getAllUsers();
      return users.find(user => user.id === userId) || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete user (admin only)
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      // First deactivate any active tokens
      await supabase
        .from('tokens')
        .update({ status: 'inactive' })
        .eq('user_id', userId);

      // Then delete the profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    paidUsers: number;
    totalRevenue: number;
    planDistribution: Record<string, number>;
  }> {
    try {
      const users = await this.getAllUsers();
      
      const totalUsers = users.length;
      const activeUsers = users.filter(user => user.token?.status === 'active').length;
      const paidUsers = users.filter(user => user.token && user.token.package !== 'free').length;
      const totalRevenue = users.reduce((sum, user) => sum + user.totalSpent, 0);
      
      const planDistribution = users.reduce((acc, user) => {
        const plan = user.token?.package || 'none';
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalUsers,
        activeUsers,
        paidUsers,
        totalRevenue,
        planDistribution
      };
    } catch (error) {
      throw error;
    }
  }
}