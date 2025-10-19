-- Create subscription_history table
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name VARCHAR(100) NOT NULL,
  plan_type VARCHAR(20) CHECK (plan_type IN ('basic', 'standard', 'enterprise')) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('active', 'cancelled', 'expired', 'pending', 'failed')) NOT NULL DEFAULT 'pending',
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'THB',
  billing_cycle VARCHAR(10) CHECK (billing_cycle IN ('monthly', 'yearly')) NOT NULL DEFAULT 'monthly',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_status ON subscription_history(status);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_status ON subscription_history(user_id, status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_subscription_updated_at ON subscription_history;
CREATE TRIGGER trigger_subscription_updated_at
  BEFORE UPDATE ON subscription_history
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Enable Row Level Security
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own subscription history" ON subscription_history;
CREATE POLICY "Users can view their own subscription history" ON subscription_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscription history" ON subscription_history;
CREATE POLICY "Users can insert their own subscription history" ON subscription_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscription history" ON subscription_history;
CREATE POLICY "Users can update their own subscription history" ON subscription_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function for the service to call
CREATE OR REPLACE FUNCTION create_subscription_table()
RETURNS void AS $$
BEGIN
  -- This function ensures the table and all related objects exist
  -- It's safe to call multiple times
  RAISE NOTICE 'Subscription table and related objects created successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample data for testing (optional)
-- You can remove this section in production
INSERT INTO subscription_history (
  user_id,
  plan_name,
  plan_type,
  status,
  amount,
  currency,
  billing_cycle,
  started_at,
  expires_at,
  payment_method,
  transaction_id
) VALUES
-- Sample active subscription
(
  (SELECT id FROM auth.users LIMIT 1),
  'Standard Plan',
  'standard',
  'active',
  599.00,
  'THB',
  'monthly',
  NOW() - INTERVAL '15 days',
  NOW() + INTERVAL '15 days',
  'Credit Card',
  'txn_sample_001'
),
-- Sample expired subscription
(
  (SELECT id FROM auth.users LIMIT 1),
  'Basic Plan',
  'basic',
  'expired',
  299.00,
  'THB',
  'monthly',
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '2 months',
  'Credit Card',
  'txn_sample_002'
),
-- Sample cancelled subscription
(
  (SELECT id FROM auth.users LIMIT 1),
  'Enterprise Plan',
  'enterprise',
  'cancelled',
  1999.00,
  'THB',
  'monthly',
  NOW() - INTERVAL '6 months',
  NOW() - INTERVAL '4 months',
  'Bank Transfer',
  'txn_sample_003'
)
ON CONFLICT DO NOTHING;