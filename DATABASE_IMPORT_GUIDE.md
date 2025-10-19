# Database Setup Instructions

## ❌ Error Resolved: Foreign Key Constraint Violation

**Problem**: The billing schema contained sample data with fake UUIDs that don't exist in the `auth.users` table.

**Solution**: Removed the problematic sample data. The tables will be populated automatically when users interact with the billing system.

## 🚀 How to Import the Schema

### Option 1: Supabase Dashboard (Recommended)
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `database/billing_schema.sql`
4. Click **Run** to execute

### Option 2: Command Line (Advanced)
```bash
psql -h [your-host] -U postgres -d postgres -f database/billing_schema.sql
```

## ✅ What Gets Created

### Tables
- `user_billing_profiles` - Omise customer references and billing info
- `user_payment_methods` - Payment method metadata for quick display
- `user_billing_settings` - User billing preferences and auto-renewal settings

### Security
- **Row Level Security (RLS)** enabled on all tables
- **Policies** ensure users can only access their own billing data
- **Indexes** for optimal query performance

### Automatic Features
- **Updated timestamps** automatically maintained
- **Foreign key constraints** ensure data integrity
- **Unique constraints** prevent duplicate records

## 🎯 After Import

1. **Verify Tables**: Check that all 3 billing tables were created
2. **Test RLS**: Policies should be active and working
3. **Run Your App**: The billing system will now work with real database storage

## 🔧 Troubleshooting

### If You Still Get Errors:
1. **Check Permissions**: Ensure your Supabase user has table creation rights
2. **Check Dependencies**: The `auth.users` table must exist (it should by default)
3. **Manual Cleanup**: If needed, drop existing tables first:
   ```sql
   DROP TABLE IF EXISTS user_billing_settings CASCADE;
   DROP TABLE IF EXISTS user_payment_methods CASCADE;
   DROP TABLE IF EXISTS user_billing_profiles CASCADE;
   ```

### Success Indicators:
- ✅ No error messages during import
- ✅ Tables visible in Supabase Table Editor
- ✅ RLS policies shown as enabled
- ✅ Your app's billing features work without console warnings

## 📝 Next Steps

After successful import:
1. **Restart Your Dev Server**: `npm start`
2. **Test Billing Modal**: Should work with real database now
3. **Check Console**: No more "table not found" warnings
4. **Try Auto-Renewal Toggle**: Should persist to database

The billing system is now fully operational with persistent database storage! 🎉