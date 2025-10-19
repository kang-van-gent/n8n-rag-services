# Database Setup for RAG Services

This directory contains the database schema and setup instructions for the RAG Services application.

## Prerequisites

- Supabase project created at [https://supabase.com](https://supabase.com)
- Supabase CLI installed (optional but recommended)

## Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. Log into your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `schema.sql`
4. Paste it into the SQL Editor and execute it
5. Verify that all tables were created successfully in the Table Editor

### Option 2: Using Supabase CLI

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Initialize Supabase in your project (if not already done):
   ```bash
   cd /path/to/your/project
   supabase init
   ```

4. Apply the schema:
   ```bash
   supabase db reset --db-url "your-supabase-db-url"
   ```

## Database Schema Overview

### Tables

1. **profiles** - User profile information (extends Supabase auth.users)
   - Stores additional user data like username, full_name, avatar_url, etc.
   - Automatically created when a new user signs up

2. **tokens** - User token management and add-ons
   - Tracks token count, used tokens, and purchased add-ons
   - Each user gets 1000 tokens by default
   - Add-ons are stored as an array of strings

3. **payment_orders** - Payment and order tracking
   - Records all payment transactions
   - Stores purchased items as JSON
   - Tracks payment status from pending to completed

4. **user_documents** - RAG document management
   - Stores uploaded document metadata
   - Tracks upload and processing status
   - Links documents to users for RAG queries

### Security

- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- Policies ensure data isolation between users
- Automatic triggers handle new user setup

### Functions & Triggers

- `handle_new_user()` - Automatically creates profile and token records for new users
- `handle_updated_at()` - Updates the updated_at timestamp on record changes
- Triggers ensure data consistency and automatic setup

## Environment Variables

Make sure your React application has the following environment variables set:

```bash
REACT_APP_SUPABASE_URL=your-supabase-project-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Verifying Setup

After running the schema, verify the setup by:

1. Checking that all tables exist in the Supabase Table Editor
2. Creating a test user account in your application
3. Verifying that profile and token records are automatically created
4. Testing the payment flow to ensure orders are recorded

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Ensure RLS policies are correctly applied
   - Check that the user is properly authenticated

2. **Missing Tables**
   - Re-run the schema.sql script
   - Check for any SQL errors in the Supabase logs

3. **Token Records Not Created**
   - Verify the trigger `on_auth_user_created` exists
   - Check that the `handle_new_user()` function is working

### Debug Commands

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Check triggers
SELECT * FROM information_schema.triggers WHERE trigger_schema = 'public';
```

## Data Management

### Backup
Always backup your data before making schema changes:
```bash
supabase db dump --db-url "your-db-url" > backup.sql
```

### Migrations
For production deployments, consider using Supabase migrations:
```bash
supabase migration new initial_schema
# Edit the migration file with your schema changes
supabase db push
```