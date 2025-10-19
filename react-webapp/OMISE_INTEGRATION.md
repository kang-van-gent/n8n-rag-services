# Omise Payment Gateway Integration Guide

## 🚀 Quick Start

Your React app now has a complete Omise payment integration! Here's what's been set up:

### ✅ Components Created

1. **OmiseService.ts** - Complete payment service layer
2. **PaymentForm.tsx** - Secure card tokenization form  
3. **BillingManagement.tsx** - Full billing management interface
4. **Updated Users.tsx** - Connected billing management

### 🔧 Setup Instructions

#### 1. Get Your Omise API Keys

1. Sign up at [Omise Dashboard](https://dashboard.omise.co/)
2. Get your **Public Key** and **Secret Key** from the dashboard
3. Start with **Test Keys** for development

#### 2. Environment Variables

Create a `.env` file in your React app root:

```bash
# Frontend (Public Key - safe to expose)
REACT_APP_OMISE_PUBLIC_KEY=pkey_test_your_public_key_here

# Backend (Secret Key - keep secure!)
OMISE_SECRET_KEY=skey_test_your_secret_key_here
```

#### 3. Test Cards for Development

Use these test cards in your development environment:

- **Visa**: `4242424242424242`
- **MasterCard**: `5555555555554444`
- **American Express**: `378282246310005`
- **Decline**: `4000000000000002`

All test cards:
- Any future expiry date (e.g., 12/25)
- Any 3-digit CVC (4 digits for Amex)
- Any cardholder name

### 💳 Features Implemented

#### Payment Form
- ✅ Secure card tokenization with Omise.js
- ✅ Real-time validation
- ✅ Multi-language support (EN/NL/TH)
- ✅ Modern responsive UI
- ✅ Error handling

#### Billing Management
- ✅ Payment method management
- ✅ Card addition/removal
- ✅ Default payment method setting
- ✅ Invoice history
- ✅ Subscription overview
- ✅ Account status

#### Integration
- ✅ Connected to Users profile page
- ✅ Modal-based billing management
- ✅ Full internationalization
- ✅ TypeScript support

### 🔗 How to Use

#### 1. Add Payment Method
```tsx
import PaymentForm from './components/PaymentForm';

<PaymentForm
  customerId="customer_id"
  onSuccess={(paymentMethod) => console.log('Added:', paymentMethod)}
  onError={(error) => console.error('Error:', error)}
/>
```

#### 2. Process Payment
```tsx
<PaymentForm
  customerId="customer_id"
  amount={99900} // 999 THB in satang
  currency="THB"
  description="Premium subscription"
  onSuccess={(result) => console.log('Payment successful:', result)}
/>
```

#### 3. Billing Management
```tsx
import BillingManagement from './components/BillingManagement';

<BillingManagement
  customerId="customer_id"
  onClose={() => setShowBilling(false)}
/>
```

### 🏗️ Backend Implementation Needed

Your frontend is ready! You'll need to implement these backend endpoints:

#### Customer Management
- `POST /api/omise/customers` - Create customer
- `GET /api/omise/customers/:id` - Get customer
- `PUT /api/omise/customers/:id/default-payment-method` - Set default

#### Payment Methods
- `POST /api/omise/customers/:id/payment-methods` - Add payment method
- `DELETE /api/omise/customers/:id/payment-methods/:id` - Remove payment method

#### Payments
- `POST /api/omise/charges` - Create payment
- `GET /api/omise/charges/:id` - Get payment status

#### Subscriptions
- `POST /api/omise/subscriptions` - Create subscription
- `GET /api/omise/customers/:id/subscriptions` - Get customer subscriptions
- `DELETE /api/omise/subscriptions/:id` - Cancel subscription

### 🔒 Security Best Practices

1. **Never expose Secret Key** - Only use on backend
2. **Use HTTPS** - Always use SSL in production
3. **Validate webhooks** - Verify webhook signatures
4. **Store minimal data** - Don't store full card numbers
5. **PCI compliance** - Omise handles card data securely

### 🎨 Customization

#### Styling
The components use Tailwind CSS with your existing design system:
- Dark/light mode support
- Glassmorphism effects
- Consistent with your app's design

#### Languages
Currently supports:
- 🇺🇸 English
- 🇳🇱 Dutch  
- 🇹🇭 Thai

Add more languages by extending the translation files.

### 🧪 Testing

#### Frontend Testing
1. Use test card numbers
2. Test form validation
3. Test error scenarios
4. Test responsive design

#### Backend Testing
1. Test API endpoints
2. Test webhook handling
3. Test error scenarios
4. Test database operations

### 📈 Production Deployment

#### 1. Switch to Live Keys
```bash
REACT_APP_OMISE_PUBLIC_KEY=pkey_live_your_live_public_key
OMISE_SECRET_KEY=skey_live_your_live_secret_key
```

#### 2. SSL Certificate
Ensure your domain has a valid SSL certificate.

#### 3. Webhook Setup
Configure webhook URL in Omise Dashboard:
```
https://yourdomain.com/api/webhooks/omise
```

#### 4. Database Migration
Run the subscription migration if using the subscription system:
```sql
-- See subscription_migration.sql
```

### 🆘 Troubleshooting

#### Common Issues

**Omise.js not loaded**
- Ensure the Omise.js script is in your `index.html`
- Check browser console for errors

**Invalid API Key**
- Verify environment variables are set correctly
- Make sure you're using the right keys for test/live mode

**CORS Issues**
- Ensure your backend allows your frontend domain
- Check Omise Dashboard allowed domains

**Tokenization Failed**
- Check card number format
- Verify expiry date is in the future
- Ensure CVC is correct length

### 🎯 Next Steps

1. **Set up backend API endpoints**
2. **Configure Omise Dashboard settings**
3. **Test with real payments (small amounts)**
4. **Set up webhook handling**
5. **Add monitoring and logging**
6. **Implement subscription management**

### 📞 Support

- **Omise Documentation**: https://docs.opn.ooo/
- **Omise Dashboard**: https://dashboard.omise.co/
- **Support**: support@omise.co

Happy coding! 🚀