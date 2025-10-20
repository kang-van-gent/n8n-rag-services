-- Migration: Add Internet Banking Support to user_payment_methods table
-- This adds the missing columns needed for saving internet banking preferences

BEGIN;

-- Add new columns for internet banking support
ALTER TABLE user_payment_methods 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'credit_card',
ADD COLUMN IF NOT EXISTS bank_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);

-- Make some existing columns optional for internet banking methods
ALTER TABLE user_payment_methods 
ALTER COLUMN omise_payment_method_id DROP NOT NULL,
ALTER COLUMN last_four_digits DROP NOT NULL,
ALTER COLUMN expiry_month DROP NOT NULL,
ALTER COLUMN expiry_year DROP NOT NULL;

-- Update existing records to have the credit_card type
UPDATE user_payment_methods 
SET type = 'credit_card' 
WHERE type IS NULL OR type = '';

-- Add check constraint for valid payment method types
ALTER TABLE user_payment_methods 
ADD CONSTRAINT valid_payment_method_type 
CHECK (type IN ('credit_card', 'internet_banking'));

-- Add check constraint: credit cards must have required fields
ALTER TABLE user_payment_methods 
ADD CONSTRAINT credit_card_required_fields 
CHECK (
    (type = 'credit_card' AND omise_payment_method_id IS NOT NULL AND last_four_digits IS NOT NULL AND expiry_month IS NOT NULL AND expiry_year IS NOT NULL)
    OR
    (type = 'internet_banking' AND bank_code IS NOT NULL AND bank_name IS NOT NULL)
);

COMMIT;

-- Verify the migration
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_payment_methods' 
ORDER BY ordinal_position;