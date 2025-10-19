-- Payment Methods and Billing Settings Schema
-- This stores payment method references and billing preferences

-- Table for storing Omise customer references
CREATE TABLE user_billing_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    omise_customer_id VARCHAR(255) NOT NULL,
    auto_renewal_enabled BOOLEAN DEFAULT true,
    default_payment_method_id VARCHAR(255),
    billing_email VARCHAR(255),
    billing_address JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id),
    UNIQUE(omise_customer_id)
);

-- Table for storing payment method metadata (for quick display)
CREATE TABLE user_payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    omise_payment_method_id VARCHAR(255) NOT NULL,
    brand VARCHAR(50) NOT NULL, -- Visa, MasterCard, etc.
    last_four_digits VARCHAR(4) NOT NULL,
    expiry_month INTEGER NOT NULL,
    expiry_year INTEGER NOT NULL,
    cardholder_name VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(omise_payment_method_id)
);

-- Table for billing preferences and settings
CREATE TABLE user_billing_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    auto_renewal_enabled BOOLEAN DEFAULT true,
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    currency VARCHAR(3) DEFAULT 'THB',
    timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- RLS Policies
ALTER TABLE user_billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_billing_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own billing data
CREATE POLICY "Users can access own billing profiles" ON user_billing_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own payment methods" ON user_payment_methods
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own billing settings" ON user_billing_settings
    FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_billing_profiles_user_id ON user_billing_profiles(user_id);
CREATE INDEX idx_user_payment_methods_user_id ON user_payment_methods(user_id);
CREATE INDEX idx_user_billing_settings_user_id ON user_billing_settings(user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_billing_profiles_updated_at 
    BEFORE UPDATE ON user_billing_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_payment_methods_updated_at 
    BEFORE UPDATE ON user_payment_methods 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_billing_settings_updated_at 
    BEFORE UPDATE ON user_billing_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: Sample data removed to avoid foreign key constraint violations
-- The tables will be populated automatically when users interact with the billing system