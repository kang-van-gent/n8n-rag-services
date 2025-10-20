// Frontend Omise.js integration service
// Note: This service handles frontend tokenization and API calls to your backend

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

export interface PaymentMethod {
  id: string;
  brand: string;
  last_digits: string;
  expiration_month: number;
  expiration_year: number;
  name: string;
  is_default: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  description?: string;
}

export interface OmiseCustomer {
  id: string;
  email: string;
  description?: string;
  payment_methods: PaymentMethod[];
  subscriptions: any[];
  created_at: string;
}

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  description?: string;
  customer_id?: string;
  token?: string;
  payment_method_id?: string;
}

export interface CreateSubscriptionRequest {
  customer_id: string;
  plan_id: string;
  payment_method_id?: string;
  start_date?: string;
}

export class OmiseService {
  private static publicKey: string | null = null;

  // Initialize Omise.js with public key
  static initialize(publicKey: string): void {
    this.publicKey = publicKey;
    if (window.Omise) {
      window.Omise.setPublicKey(publicKey);
    } else {
      console.error('Omise.js not loaded. Make sure the script is included in your HTML.');
    }
  }

  // Create secure token for card data (frontend only)
  static createCardToken(cardData: CardData): Promise<TokenResponse> {
    return new Promise((resolve, reject) => {
      if (!window.Omise) {
        reject(new Error('Omise.js not loaded'));
        return;
      }

      if (!this.publicKey) {
        reject(new Error('Omise public key not set. Call initialize() first.'));
        return;
      }

      window.Omise.createToken('card', cardData, (statusCode: number, response: TokenResponse) => {
        if (statusCode === 200) {
          resolve(response);
        } else {
          reject(new Error(`Tokenization failed: ${statusCode}`));
        }
      });
    });
  }

  // Utility methods
  static formatAmount(amount: number): number {
    // Convert from THB to satang (multiply by 100)
    return Math.round(amount * 100);
  }

  static formatCurrency(amount: number, currency: string = 'THB'): string {
    // Convert from satang to THB for display
    const displayAmount = amount / 100;
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: currency,
    }).format(displayAmount);
  }

  // API calls to your backend (these will be implemented in your backend)
  static async createCustomer(data: {
    email: string;
    description?: string;
    token?: string;
  }): Promise<OmiseCustomer> {
    const response = await fetch('/api/omise/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create customer');
    }

    return response.json();
  }

  static async getCustomer(customerId: string): Promise<OmiseCustomer> {
    const response = await fetch(`/api/omise/customers/${customerId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get customer');
    }

    return response.json();
  }

  static async addPaymentMethod(customerId: string, token: string): Promise<PaymentMethod> {
    const response = await fetch(`/api/omise/customers/${customerId}/payment-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Failed to add payment method');
    }

    return response.json();
  }

  static async deletePaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    const response = await fetch(`/api/omise/customers/${customerId}/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete payment method');
    }
  }

  static async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    const response = await fetch(`/api/omise/customers/${customerId}/default-payment-method`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ payment_method_id: paymentMethodId }),
    });

    if (!response.ok) {
      throw new Error('Failed to set default payment method');
    }
  }

  static async createPayment(data: CreatePaymentRequest): Promise<any> {
    const response = await fetch('/api/omise/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        ...data,
        amount: this.formatAmount(data.amount), // Convert to satang
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment');
    }

    return response.json();
  }

  static async createSubscription(data: CreateSubscriptionRequest): Promise<any> {
    const response = await fetch('/api/omise/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create subscription');
    }

    return response.json();
  }

  static async cancelSubscription(subscriptionId: string): Promise<void> {
    const response = await fetch(`/api/omise/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }
  }

  static async getSubscriptions(customerId: string): Promise<any[]> {
    const response = await fetch(`/api/omise/customers/${customerId}/subscriptions`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get subscriptions');
    }

    return response.json();
  }

  // Validation helpers
  static validateCardNumber(number: string): boolean {
    // Remove spaces and check if it's numeric
    const cleaned = number.replace(/\s/g, '');
    return /^\d{13,19}$/.test(cleaned);
  }

  static validateExpiryDate(month: number, year: number): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;
    if (month < 1 || month > 12) return false;

    return true;
  }

  static validateCVC(cvc: string): boolean {
    return /^\d{3,4}$/.test(cvc);
  }

  // Display helpers
  static getCardBrandIcon(brand: string): string {
    const brandIcons: Record<string, string> = {
      'Visa': '💳',
      'MasterCard': '💳',
      'American Express': '💳',
      'JCB': '💳',
      'Diners Club': '💳',
      'Discover': '💳',
    };
    return brandIcons[brand] || '💳';
  }

  static formatCardNumber(number: string): string {
    // Format card number with spaces every 4 digits
    return number.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
  }

  static maskCardNumber(number: string): string {
    const cleaned = number.replace(/\s/g, '');
    const masked = '**** **** **** ' + cleaned.slice(-4);
    return masked;
  }

  static getStatusDisplay(status: string): { label: string; color: string; bgColor: string } {
    const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
      'successful': { 
        label: 'Successful', 
        color: 'text-green-800 dark:text-green-300', 
        bgColor: 'bg-green-100 dark:bg-green-900/30' 
      },
      'pending': { 
        label: 'Pending', 
        color: 'text-yellow-800 dark:text-yellow-300', 
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' 
      },
      'failed': { 
        label: 'Failed', 
        color: 'text-red-800 dark:text-red-300', 
        bgColor: 'bg-red-100 dark:bg-red-900/30' 
      },
      'reversed': { 
        label: 'Refunded', 
        color: 'text-gray-800 dark:text-gray-300', 
        bgColor: 'bg-gray-100 dark:bg-gray-900/30' 
      },
      'active': { 
        label: 'Active', 
        color: 'text-green-800 dark:text-green-300', 
        bgColor: 'bg-green-100 dark:bg-green-900/30' 
      },
      'suspended': { 
        label: 'Suspended', 
        color: 'text-orange-800 dark:text-orange-300', 
        bgColor: 'bg-orange-100 dark:bg-orange-900/30' 
      },
      'expired': { 
        label: 'Expired', 
        color: 'text-gray-800 dark:text-gray-300', 
        bgColor: 'bg-gray-100 dark:bg-gray-900/30' 
      },
      'cancelled': { 
        label: 'Cancelled', 
        color: 'text-red-800 dark:text-red-300', 
        bgColor: 'bg-red-100 dark:bg-red-900/30' 
      },
    };
    return statusMap[status] || { 
      label: status, 
      color: 'text-gray-800 dark:text-gray-300', 
      bgColor: 'bg-gray-100 dark:bg-gray-900/30' 
    };
  }
}

export default OmiseService;