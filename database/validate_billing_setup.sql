-- Validation script to run AFTER importing billing_schema.sql
-- This helps verify everything was set up correctly

-- Check if all tables were created
SELECT 'user_billing_profiles' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_billing_profiles') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'user_payment_methods' as table_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_payment_methods') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'user_billing_settings' as table_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_billing_settings') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity as rls_enabled 
FROM pg_tables 
WHERE tablename IN ('user_billing_profiles', 'user_payment_methods', 'user_billing_settings');

-- Check if policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_billing_profiles', 'user_payment_methods', 'user_billing_settings');

-- Verify table structures (basic check)
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name IN ('user_billing_profiles', 'user_payment_methods', 'user_billing_settings')
ORDER BY table_name, ordinal_position;