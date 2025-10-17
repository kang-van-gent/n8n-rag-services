import { supabase } from '../lib/supabase';

export interface Token {
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

export class TokenService {
  /**
   * Get user's active token
   */
  static async getUserToken(userId: string): Promise<Token | null> {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user has no active token
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user token:', error);
      throw error;
    }
  }

  /**
   * Check if user has an active token
   */
  static async hasActiveToken(userId: string): Promise<boolean> {
    try {
      const token = await this.getUserToken(userId);
      return token !== null;
    } catch (error) {
      console.error('Error checking active token:', error);
      return false;
    }
  }

  /**
   * Create a new token for user
   */
  static async createToken(
    userId: string,
    tokenData: {
      token: string;
      package: string;
      type: string;
      features?: any[];
      addons?: any[];
      expiredAt?: string;
    }
  ): Promise<Token> {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .insert({
          user_id: userId,
          token: tokenData.token,
          package: tokenData.package,
          type: tokenData.type,
          features: tokenData.features || [],
          addons: tokenData.addons || [],
          expiredAt: tokenData.expiredAt,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  }

  /**
   * Deactivate user's token
   */
  static async deactivateToken(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tokens')
        .update({ status: 'inactive' })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;
    } catch (error) {
      console.error('Error deactivating token:', error);
      throw error;
    }
  }

  /**
   * Validate and activate an existing token by token string
   */
  static async validateAndActivateToken(
    userId: string,
    tokenString: string
  ): Promise<Token> {
    try {
      // First check if the token exists in the tokens table
      const { data: existingToken, error: fetchError } = await supabase
        .from('tokens')
        .select('*')
        .eq('token', tokenString)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No rows returned - token doesn't exist
          throw new Error('Invalid token: Token not found');
        }
        throw fetchError;
      }

      // Check if token is already assigned to another user
      if (existingToken.user_id && existingToken.user_id !== userId) {
        throw new Error('Token already in use by another user');
      }

      // Check if token is already active for this user
      if (existingToken.user_id === userId && existingToken.status === 'active') {
        throw new Error('Token is already active for your account');
      }

      // Activate the token for this user
      const { data, error } = await supabase
        .from('tokens')
        .update({ 
          user_id: userId, 
          status: 'active',
          created_at: new Date().toISOString()
        })
        .eq('token', tokenString)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error validating and activating token:', error);
      throw error;
    }
  }

  /**
   * Update token features or addons
   */
  static async updateTokenFeatures(
    userId: string,
    updates: {
      features?: any[];
      addons?: any[];
      package?: string;
      type?: string;
    }
  ): Promise<Token> {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .update(updates)
        .eq('user_id', userId)
        .eq('status', 'active')
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating token:', error);
      throw error;
    }
  }
}