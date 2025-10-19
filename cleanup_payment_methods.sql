-- Clean up old payment methods with invalid tokens
-- Run this in your Supabase SQL editor

DELETE FROM user_payment_methods 
WHERE omise_payment_method_id LIKE 'card_test_%' 
OR omise_payment_method_id LIKE 'tokn_test_%';

-- This will force users to create new payment methods with the correct API keys