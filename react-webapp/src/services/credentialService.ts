import { supabase } from '../lib/supabase';

export interface Credential {
  id: number;
  created_at: string;
  key: string | null;  // Changed from platform to key
  accessToken: string | null;
  recipientId: string | null;
  userId: string | null;
}

export class CredentialService {
  /**
   * Check if user is authenticated and can access credentials
   */
  static async checkAuthentication(): Promise<{ isAuthenticated: boolean; userId?: string; error?: string }> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        return { isAuthenticated: false, error: error.message };
      }
      
      if (!session || !session.user) {
        return { isAuthenticated: false, error: 'No active session' };
      }
      
      return { isAuthenticated: true, userId: session.user.id };
    } catch (error) {
      return { 
        isAuthenticated: false, 
        error: error instanceof Error ? error.message : 'Authentication check failed' 
      };
    }
  }

  /**
   * Get all credentials for the current user
   */
  static async getUserCredentials(userId: string): Promise<Credential[]> {
    try {
      // Ensure we have an authenticated session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.warn('No authenticated session, returning empty credentials');
        return [];
      }

      // Only query for the authenticated user's credentials
      const { data, error } = await supabase
        .from('credentials')
        .select('*')
        .eq('userId', session.user.id);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user credentials:', error);
      throw error;
    }
  }

  /**
   * Check if a key credential exists for the user
   */
  static async hasKeyCredential(userId: string, key: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('credentials')
        .select('id')
        .eq('userId', userId)
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - credential doesn't exist
          return false;
        }
        throw error;
      }

      return data !== null;
    } catch (error) {
      console.error('Error checking key credential:', error);
      return false;
    }
  }

  /**
   * Get keys that have credentials for the user
   */
  static async getUserKeys(userId: string): Promise<string[]> {
    try {
      const credentials = await this.getUserCredentials(userId);
      return credentials
        .filter(cred => cred.key)
        .map(cred => cred.key!)
        .filter((key, index, array) => array.indexOf(key) === index); // Remove duplicates
    } catch (error) {
      console.error('Error getting user keys:', error);
      return [];
    }
  }

  /**
   * Create a new credential for the user
   */
  static async createCredential(
    userId: string,
    key: string,
    accessToken: string,
    recipientId: string
  ): Promise<Credential> {
    try {
      // Ensure we have an authenticated session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication required');
      }
      
      if (!session) {
        throw new Error('No active session found');
      }

      // Verify the userId matches the authenticated user
      if (session.user.id !== userId) {
        throw new Error('User ID mismatch');
      }

      console.log('Creating credential with authenticated session:', {
        userId,
        key,
        sessionUserId: session.user.id,
        hasAccessToken: !!accessToken,
        hasRecipientId: !!recipientId
      });

      const { data, error } = await supabase
        .from('credentials')
        .insert([
          {
            userId: session.user.id, // Use the authenticated user's ID
            key,
            accessToken,
            recipientId
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        
        // Handle specific RLS errors
        if (error.code === '42501') {
          throw new Error('Permission denied. Please make sure you are logged in and have the correct permissions.');
        }
        
        throw error;
      }
      
      console.log('Credential created successfully:', data);
      return data;
    } catch (error) {
      console.error('Error creating credential:', error);
      throw error;
    }
  }
}