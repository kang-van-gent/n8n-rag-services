import { supabase } from '../lib/supabase';

// Token generation following the n8n pattern
export class TokenGenerationService {
  private static readonly DEFAULT_PACKAGE = 'basic';
  private static readonly DEFAULT_TYPE = 'monthly';

  // ------------------ helpers ------------------
  private static randStr(len = 20): string {
    let out = '';
    while (out.length < len) out += Math.random().toString(36).slice(2);
    return out.slice(0, len);
  }

  private static normalizePackage(p: string): string {
    return String(p || '').trim().toLowerCase();
  }

  private static packageCode(p: string): string {
    const n = this.normalizePackage(p);
    const cleaned = n.replace(/[^a-z0-9]/gi, '');
    return (cleaned.slice(0, 4) || 'pkg').toUpperCase();
  }

  private static generateTokenString(pkgName: string): string {
    const ts = Date.now().toString(36);
    const rnd = this.randStr(16);
    const salt = this.randStr(6);
    const pfx = this.packageCode(pkgName);
    return `${pfx}-${ts}-${rnd}${salt}`;
  }

  // ------------------ feature catalog ------------------
  private static readonly FEATURE_UNITS = {
    line_chat: 'flag',
    facebook_chat: 'flag',
    rag_files: 'files',
    calendar_agent: 'flag',
    gdrive_agent: 'flag',
  };

  private static readonly PLAN_FEATURES = {
    basic: [
      { feature_key: 'line_chat', unit: 'flag', value: null },
      { feature_key: 'rag_files', unit: 'files', value: 3 },
    ],
    standard: [
      { feature_key: 'line_chat', unit: 'flag', value: null },
      { feature_key: 'facebook_chat', unit: 'flag', value: null },
      { feature_key: 'rag_files', unit: 'files', value: 5 },
    ],
    enterprise: [
      { feature_key: 'line_chat', unit: 'flag', value: null },
      { feature_key: 'facebook_chat', unit: 'flag', value: null },
      { feature_key: 'calendar_agent', unit: 'flag', value: null },
      { feature_key: 'gdrive_agent', unit: 'flag', value: null },
      { feature_key: 'rag_files', unit: 'files', value: 10 },
    ],
  };

  // ------------------ expiration helper ------------------
  private static calcExpiry(type = this.DEFAULT_TYPE): string {
    const now = new Date();
    const expiry = new Date(now);
    if (type.toLowerCase() === 'monthly') expiry.setMonth(now.getMonth() + 1);
    else if (type.toLowerCase() === 'yearly') expiry.setFullYear(now.getFullYear() + 1);
    return expiry.toISOString();
  }

  // ------------------ main generator ------------------
  static composeToken(pkg?: string, type?: string) {
    const cleanPkg = this.normalizePackage(pkg || this.DEFAULT_PACKAGE);
    const token = this.generateTokenString(cleanPkg);
    const features = this.PLAN_FEATURES[cleanPkg as keyof typeof this.PLAN_FEATURES] || this.PLAN_FEATURES[this.DEFAULT_PACKAGE];
    const expiredAt = this.calcExpiry(type);

    return {
      package: cleanPkg,
      token,
      status: 'inactive', // change to active after payment confirmed
      type: (type || this.DEFAULT_TYPE).toLowerCase(),
      features,
      addons: [],
      expiredAt,
    };
  }

  // Create token in database
  static async createTokenForUser(
    userId: string, 
    pkg?: string, 
    type?: string
  ) {
    try {
      const tokenData = this.composeToken(pkg, type);
      
      const { data, error } = await supabase
        .from('tokens')
        .insert({
          user_id: userId,
          ...tokenData,
          status: 'active' // Activate immediately for renewal
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

  // Renew existing token (extend expiry by 1 month from current expiredAt)
  static async renewToken(userId: string, currentToken: any) {
    try {
      // Add exactly 1 month to the current expiredAt date
      const currentExpiry = new Date(currentToken.expiredAt || new Date());
      const newExpiry = new Date(currentExpiry);
      newExpiry.setMonth(currentExpiry.getMonth() + 1);
      
      const { data, error } = await supabase
        .from('tokens')
        .update({
          expiredAt: newExpiry.toISOString(),
          status: 'active'
        })
        .eq('user_id', userId)
        .eq('id', currentToken.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error renewing token:', error);
      throw error;
    }
  }
}