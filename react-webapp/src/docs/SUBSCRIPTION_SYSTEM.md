# Subscription Management System

This document outlines the subscription management system implementation for the n8n-rag-services project.

## Overview

The subscription system tracks user subscription history, billing cycles, and provides comprehensive subscription analytics for the users page.

## Database Schema

### Subscription History Table

```sql
subscription_history (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  plan_name VARCHAR(100) NOT NULL,
  plan_type VARCHAR(20) CHECK (plan_type IN ('basic', 'standard', 'enterprise')),
  status VARCHAR(20) CHECK (status IN ('active', 'cancelled', 'expired', 'pending', 'failed')),
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'THB',
  billing_cycle VARCHAR(10) CHECK (billing_cycle IN ('monthly', 'yearly')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

## Features

### 1. Subscription History Tracking
- Complete history of all user subscriptions
- Status tracking (active, expired, cancelled, pending, failed)
- Payment method and transaction tracking
- Billing cycle management (monthly/yearly)

### 2. Subscription Analytics
- Total subscriptions count
- Total amount spent across all subscriptions
- Current subscription streak (consecutive months)
- Member since date (first subscription)

### 3. User Interface Components
- **Current Plan Display**: Shows active subscription with status badge
- **Billing Information**: Next billing date and auto-renewal status
- **Subscription Summary**: Quick stats about subscription history
- **History Timeline**: Recent subscriptions with status and amounts
- **Plan Actions**: Upgrade and manage billing buttons

## Setup Instructions

### 1. Database Setup

Run the migration script to create the subscription_history table:

```bash
# Execute the migration file in your Supabase SQL editor
psql -f src/database/subscription_migration.sql
```

Or run the SQL commands directly in the Supabase SQL editor:
- Navigate to your Supabase project dashboard
- Go to SQL Editor
- Copy and paste the contents of `src/database/subscription_migration.sql`
- Execute the script

### 2. Environment Configuration

The subscription service is already configured to work with your existing Supabase setup. No additional environment variables are needed.

### 3. Service Integration

The `SubscriptionService` is already integrated into the Users page and provides:
- Automatic data loading when user logs in
- Real-time subscription history display
- Currency formatting for Thai Baht (THB)
- Status badge styling based on subscription status

## API Methods

### SubscriptionService Methods

```typescript
// Get subscription history for a user
getSubscriptionHistory(userId: string, limit?: number): Promise<SubscriptionHistory[]>

// Get subscription summary with analytics
getSubscriptionSummary(userId: string): Promise<SubscriptionSummary>

// Create a new subscription record
createSubscription(subscription: Omit<SubscriptionHistory, 'id' | 'created_at' | 'updated_at'>): Promise<SubscriptionHistory | null>

// Update subscription status
updateSubscriptionStatus(subscriptionId: string, status: string, cancelledAt?: string): Promise<boolean>

// Get active subscription for a user
getActiveSubscription(userId: string): Promise<SubscriptionHistory | null>

// Utility methods
formatCurrency(amount: number, currency?: string): string
getPlanDisplayName(planType: string): string
getStatusDisplay(status: string): { label: string; color: string; bgColor: string; }
```

## Data Flow

1. **User Login**: When a user logs in, the Users page automatically loads subscription data
2. **Data Fetching**: The service fetches both subscription history and summary analytics
3. **Display**: The UI renders the current plan, billing info, summary stats, and history timeline
4. **Real-time Updates**: Any subscription changes are reflected immediately in the UI

## Sample Data

The migration includes sample subscription records for testing:
- Active Standard Plan subscription
- Expired Basic Plan subscription  
- Cancelled Enterprise Plan subscription

## Internationalization

The subscription section supports three languages:
- **English**: Full subscription terminology
- **Dutch**: Complete translation of all subscription terms
- **Thai**: Comprehensive localization including currency formatting

## Security

### Row Level Security (RLS)
- Users can only access their own subscription records
- Automatic user_id filtering based on authenticated user
- Secure data isolation between users

### Data Protection
- All sensitive subscription data is protected by Supabase RLS
- Payment methods and transaction IDs are stored securely
- Audit trail maintained with created_at and updated_at timestamps

## Future Enhancements

### Planned Features
1. **Payment Integration**: Connect with Stripe/PayPal for automatic subscription creation
2. **Email Notifications**: Billing reminders and renewal notifications
3. **Subscription Metrics**: Advanced analytics dashboard for admins
4. **Plan Upgrades**: In-app plan upgrade and downgrade functionality
5. **Billing Export**: PDF invoice generation and download
6. **Proration Handling**: Smart billing calculations for mid-cycle changes

### Extensibility
The schema and service are designed to be easily extended with:
- Additional payment methods
- Discount codes and promotions
- Multi-currency support
- Enterprise billing features
- Usage-based billing metrics

## Troubleshooting

### Common Issues

1. **No subscription data showing**
   - Verify the migration has been run
   - Check Supabase RLS policies are active
   - Ensure user is authenticated

2. **Currency formatting issues**
   - Check browser locale support
   - Verify currency code in database
   - Fallback formatting is provided for unsupported locales

3. **Date formatting problems**
   - Ensure dates are stored in ISO 8601 format
   - Check timezone handling in formatDate utility
   - Verify date parsing in different browsers

### Debug Mode

Enable debug logging by checking the browser console for:
- Subscription service errors
- Database query results  
- Authentication status
- Data loading states

## Contributing

When adding new subscription features:
1. Update the database schema if needed
2. Add new methods to SubscriptionService
3. Update TypeScript interfaces
4. Add translations for all supported languages
5. Test with different subscription states
6. Update this documentation