import { Feature } from './featureService';

export interface TokenFeature {
  featureKey: string;
  quantity: number;
  displayName?: string;
}

export interface TokenPlan {
  id: string;
  name: string;
  features: TokenFeature[];
  addOns?: string[]; // Feature keys purchased as add-ons
}

export interface TokenCompat {
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

export class TokenFeatureService {
  /**
   * Define available plans and their included features
   */
  private static readonly PLAN_DEFINITIONS: Record<string, TokenFeature[]> = {
    basic: [
      { featureKey: 'line_chat', quantity: 1, displayName: 'LINE Chat Bot' },
      { featureKey: 'rag_files', quantity: 1, displayName: 'RAG Document Storage' }
    ],
    standard: [
      { featureKey: 'line_chat', quantity: 2, displayName: 'LINE Chat Bot' },
      { featureKey: 'facebook_chat', quantity: 1, displayName: 'Facebook Messenger' },
      { featureKey: 'rag_files', quantity: 3, displayName: 'RAG Document Storage' }
    ],
    enterprise: [
      { featureKey: 'line_chat', quantity: 2, displayName: 'LINE Chat Bot' },
      { featureKey: 'facebook_chat', quantity: 1, displayName: 'Facebook Messenger' },
      { featureKey: 'rag_files', quantity: 5, displayName: 'RAG Document Storage' },
      { featureKey: 'calendar_agent', quantity: 1, displayName: 'Calendar Management Agent' },
      { featureKey: 'gdrive_agent', quantity: 1, displayName: 'Google Drive Integration' }
    ]
  };

  /**
   * Get features included in a specific token plan
   */
  static getIncludedFeatures(token: TokenCompat | null): TokenFeature[] {
    if (!token || token.status !== 'active') {
      return [];
    }

    const planFeatures = this.PLAN_DEFINITIONS[token.package.toLowerCase()] || [];
    
    // Add any purchased add-ons
    const addOnFeatures: TokenFeature[] = [];
    if (token.addons && Array.isArray(token.addons)) {
      token.addons.forEach((addon: any) => {
        // Handle both string keys and addon objects
        let addonKey: string;
        
        if (typeof addon === 'string') {
          addonKey = addon;
        } else if (addon.key) {
          addonKey = addon.key;
        } else if (addon.id) {
          // Handle legacy format where key might be in id (before underscore)
          addonKey = addon.id.split('_')[0];
        } else {
          console.warn('Invalid addon format:', addon);
          return;
        }
        
        // Check if it's not already included in the base plan
        if (addonKey && !planFeatures.find(f => f.featureKey === addonKey)) {
          addOnFeatures.push({
            featureKey: addonKey,
            quantity: addon.quantity || 1,
            displayName: this.getFeatureDisplayName(addonKey)
          });
        }
      });
    }

    return [...planFeatures, ...addOnFeatures];
  }

  /**
   * Filter database features to show only those included in token
   */
  static filterIncludedFeatures(dbFeatures: Feature[], token: TokenCompat | null): Feature[] {
    if (!token || token.status !== 'active') {
      return [];
    }

    const includedFeatures = this.getIncludedFeatures(token);
    const includedKeys = new Set(includedFeatures.map(f => f.featureKey));

    return dbFeatures.filter(feature => includedKeys.has(feature.key));
  }

  /**
   * Get features that can be purchased as add-ons
   */
  static getAvailableAddOns(dbFeatures: Feature[], token: TokenCompat | null): Feature[] {
    if (!token || token.status !== 'active') {
      return dbFeatures.filter(feature => feature.category !== 'addon');
    }

    const includedFeatures = this.getIncludedFeatures(token);
    const includedKeys = new Set(includedFeatures.map(f => f.featureKey));

    return dbFeatures.filter(feature => 
      !includedKeys.has(feature.key) && 
      feature.category !== 'addon'
    );
  }

  /**
   * Generate repeated feature cards based on quantity
   */
  static generateFeatureCards(
    dbFeatures: Feature[], 
    token: TokenCompat | null
  ): Array<Feature & { instanceId: string; instanceNumber: number; maxInstances: number }> {
    const includedFeatures = this.getIncludedFeatures(token);
    const cards: Array<Feature & { instanceId: string; instanceNumber: number; maxInstances: number }> = [];

    includedFeatures.forEach(tokenFeature => {
      const dbFeature = dbFeatures.find(f => f.key === tokenFeature.featureKey);
      if (dbFeature) {
        // Create multiple cards based on quantity
        for (let i = 1; i <= tokenFeature.quantity; i++) {
          cards.push({
            ...dbFeature,
            instanceId: `${dbFeature.key}_${i}`,
            instanceNumber: i,
            maxInstances: tokenFeature.quantity,
            name: tokenFeature.quantity > 1 
              ? `${dbFeature.name} #${i}`
              : dbFeature.name
          });
        }
      }
    });

    return cards;
  }

  /**
   * Check if a user can access a specific feature
   */
  static canAccessFeature(featureKey: string, token: TokenCompat | null): boolean {
    if (!token || token.status !== 'active') {
      return false;
    }

    const includedFeatures = this.getIncludedFeatures(token);
    return includedFeatures.some(f => f.featureKey === featureKey);
  }

  /**
   * Get feature limits for a user
   */
  static getFeatureLimit(featureKey: string, token: TokenCompat | null): number {
    if (!token || token.status !== 'active') {
      return 0;
    }

    const includedFeatures = this.getIncludedFeatures(token);
    const feature = includedFeatures.find(f => f.featureKey === featureKey);
    return feature ? feature.quantity : 0;
  }

  /**
   * Get display name for a feature key
   */
  private static getFeatureDisplayName(featureKey: string): string {
    const displayNames: Record<string, string> = {
      line_chat: 'LINE Chat Bot',
      facebook_chat: 'Facebook Messenger',
      rag_files: 'RAG Document Storage',
      calendar_agent: 'Calendar Management Agent',
      gdrive_agent: 'Google Drive Integration',
      analytics_dashboard: 'Analytics Dashboard',
      webhook_integration: 'Webhook Integration',
      api_access: 'API Access'
    };

    // Ensure featureKey is a string and handle edge cases
    if (typeof featureKey !== 'string') {
      console.warn('Feature key is not a string:', featureKey);
      return 'Unknown Feature';
    }

    return displayNames[featureKey] || featureKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get base plan pricing
   */
  static getBasePlanPricing(): Record<string, { price: string; period: string }> {
    return {
      basic: { price: '299', period: 'month' },
      standard: { price: '599', period: 'month' },
      enterprise: { price: '1299', period: 'month' }
    };
  }

  /**
   * Get add-on pricing (this could be moved to a separate pricing service)
   */
  static getAddOnPricing(): Record<string, { price: string; period: string }> {
    return {
      line_chat: { price: '199', period: 'month' },
      facebook_chat: { price: '299', period: 'month' },
      rag_files: { price: '99', period: 'month' },
      calendar_agent: { price: '499', period: 'month' },
      gdrive_agent: { price: '399', period: 'month' },
      analytics_dashboard: { price: '299', period: 'month' },
      webhook_integration: { price: '199', period: 'month' },
      api_access: { price: '599', period: 'month' }
    };
  }

  /**
   * Calculate total renewal price including base plan and purchased add-ons
   */
  static calculateRenewalPrice(
    token: TokenCompat | null, 
    paymentOrders: any[]
  ): { basePrice: number; addOnPrice: number; totalPrice: number; breakdown: any[] } {
    if (!token) {
      return { basePrice: 0, addOnPrice: 0, totalPrice: 0, breakdown: [] };
    }

    const basePricing = this.getBasePlanPricing();
    const addOnPricing = this.getAddOnPricing();
    
    // Get base plan price
    const basePlan = basePricing[token.package.toLowerCase()];
    const basePrice = basePlan ? parseInt(basePlan.price) : 0;

    // Calculate add-on prices from completed payment orders
    let addOnPrice = 0;
    const breakdown: any[] = [
      {
        type: 'plan',
        name: `${token.package.charAt(0).toUpperCase() + token.package.slice(1)} Plan`,
        price: basePrice,
        period: basePlan?.period || 'month'
      }
    ];

    // Get unique add-ons from payment orders
    const purchasedAddOns = new Set();
    paymentOrders
      .filter(order => order.status === 'completed')
      .forEach(order => {
        order.items.forEach((item: any) => {
          if (!purchasedAddOns.has(item.feature.key)) {
            purchasedAddOns.add(item.feature.key);
            const addonPrice = addOnPricing[item.feature.key];
            if (addonPrice) {
              const price = parseInt(addonPrice.price);
              addOnPrice += price;
              breakdown.push({
                type: 'addon',
                name: item.feature.name,
                key: item.feature.key,
                price: price,
                period: addonPrice.period
              });
            }
          }
        });
      });

    return {
      basePrice,
      addOnPrice,
      totalPrice: basePrice + addOnPrice,
      breakdown
    };
  }
}