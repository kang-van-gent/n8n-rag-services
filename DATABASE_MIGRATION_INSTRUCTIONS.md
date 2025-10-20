# Database Migration Instructions

## Problem
The `user_payment_methods` table is missing columns needed for internet banking support:
- `type` (to distinguish credit_card vs internet_banking)
- `bank_code` (for bank identification like 'kbank', 'bbl', etc.)  
- `bank_name` (for display name like 'Kasikorn Bank')

## Solution
Run the migration script to add the missing columns.

## How to Run the Migration

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project: https://nwqyhfblltmolctnqnrl.supabase.co
2. Navigate to the SQL Editor
3. Copy and paste the contents of `/database/add_internet_banking_support.sql`
4. Click "Run" to execute the migration

### Option 2: Via Command Line (if you have psql installed)
```bash
# Navigate to the database directory
cd /Users/apple/Desktop/n8n-rag-services/database

# Run the migration (replace with your actual connection string)
psql "postgresql://postgres:[password]@db.nwqyhfblltmolctnqnrl.supabase.co:5432/postgres" -f add_internet_banking_support.sql
```

### Option 3: Via Supabase CLI (if installed)
```bash
supabase db reset --db-url "your-connection-string"
```

## What the Migration Does
1. ✅ Adds `type` column (credit_card | internet_banking)
2. ✅ Adds `bank_code` column for internet banking
3. ✅ Adds `bank_name` column for display
4. ✅ Makes credit card fields optional (for internet banking)
5. ✅ Adds constraints to ensure data integrity
6. ✅ Updates existing records to have type 'credit_card'

## After Migration
Once the migration is complete, your internet banking payment method additions will work properly!

## Verification
The migration includes a verification query at the end to show the new table structure.