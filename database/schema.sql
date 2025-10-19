-- RAG Services Database Schema
-- This file contains all the necessary tables for the RAG services application

-- Enable RLS (Row Level Security) and necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  website text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Note: Using existing tokens table structure
-- Your existing table already has the required structure with:
-- - features jsonb
-- - addons jsonb  
-- - user_id uuid
-- - status text
-- - type enum
-- - package text
-- No need to recreate this table

-- Payment orders table for tracking purchases
CREATE TABLE IF NOT EXISTS public.payment_orders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  items jsonb NOT NULL, -- Array of purchased items with their details
  total_amount decimal(10,2) NOT NULL,
  currency varchar(3) DEFAULT 'USD' NOT NULL,
  payment_method varchar(50) NOT NULL,
  status varchar(20) DEFAULT 'pending' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at timestamp with time zone,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

-- User documents table for RAG document management
CREATE TABLE IF NOT EXISTS public.user_documents (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  content_type text,
  upload_status varchar(20) DEFAULT 'uploading' NOT NULL,
  processed_status varchar(20) DEFAULT 'pending' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT valid_upload_status CHECK (upload_status IN ('uploading', 'completed', 'failed')),
  CONSTRAINT valid_processed_status CHECK (processed_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Note: tokens table RLS should be managed according to your existing setup
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Note: RLS policies for tokens table should be configured according to your existing setup
-- Since you already have the tokens table with its own structure and policies

-- RLS policies for payment_orders
DROP POLICY IF EXISTS "Users can view own orders." ON public.payment_orders;
CREATE POLICY "Users can view own orders." ON public.payment_orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own orders." ON public.payment_orders;
CREATE POLICY "Users can insert own orders." ON public.payment_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own orders." ON public.payment_orders;
CREATE POLICY "Users can update own orders." ON public.payment_orders
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for user_documents
DROP POLICY IF EXISTS "Users can view own documents." ON public.user_documents;
CREATE POLICY "Users can view own documents." ON public.user_documents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents." ON public.user_documents;
CREATE POLICY "Users can insert own documents." ON public.user_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents." ON public.user_documents;
CREATE POLICY "Users can update own documents." ON public.user_documents
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents." ON public.user_documents;
CREATE POLICY "Users can delete own documents." ON public.user_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
-- Note: tokens table indexes already exist in your setup
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON public.payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);

-- Functions
-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  -- Note: Token creation should be handled according to your existing business logic
  
  RETURN new;
END;
$$ language plpgsql security definer;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Note: tokens table already has its own updated_at trigger

DROP TRIGGER IF EXISTS handle_updated_at ON public.user_documents;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.user_documents
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();