import { supabase } from '../lib/supabase';

export interface Feature {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  is_metered: boolean;
  default_limit: number | null;
  is_deprecated: boolean;
  created_at: string;
}

export class FeatureService {
  /**
   * Get all features from the database
   */
  static async getAllFeatures(): Promise<Feature[]> {
    try {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('is_deprecated', false)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching features:', error);
      throw error;
    }
  }

  /**
   * Get feature by key
   */
  static async getFeatureByKey(key: string): Promise<Feature | null> {
    try {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('key', key)
        .eq('is_deprecated', false)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - feature doesn't exist
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching feature by key:', error);
      return null;
    }
  }

  /**
   * Get features by keys
   */
  static async getFeaturesByKeys(keys: string[]): Promise<Feature[]> {
    try {
      if (keys.length === 0) return [];

      const { data, error } = await supabase
        .from('features')
        .select('*')
        .in('key', keys)
        .eq('is_deprecated', false)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching features by keys:', error);
      throw error;
    }
  }

  /**
   * Get features by category
   */
  static async getFeaturesByCategory(category: string): Promise<Feature[]> {
    try {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('category', category)
        .eq('is_deprecated', false)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching features by category:', error);
      throw error;
    }
  }
}