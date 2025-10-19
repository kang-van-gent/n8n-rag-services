-- Your existing plans table structure:
-- CREATE TABLE public.plans (
--   id uuid not null default gen_random_uuid (),
--   key text not null,
--   name text not null,
--   description text null,
--   is_active boolean not null default true,
--   created_at timestamp with time zone not null default now(),
--   price text null,
--   currency text null,
--   billing_cycle text null,
--   constraint plans_pkey primary key (id),
--   constraint plans_key_key unique (key)
-- );

-- Add missing columns if they don't exist
DO $$ 
BEGIN 
  -- Add features column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plans' 
    AND column_name = 'features'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.plans ADD COLUMN features jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'plans' 
    AND column_name = 'updated_at'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.plans ADD COLUMN updated_at timestamp with time zone DEFAULT now();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read plans (they are public)
DROP POLICY IF EXISTS "Plans are publicly readable." ON public.plans;
CREATE POLICY "Plans are publicly readable." ON public.plans
FOR SELECT TO anon, authenticated USING (true);

-- Only authenticated users can insert/update plans (admin functionality)
DROP POLICY IF EXISTS "Authenticated users can manage plans." ON public.plans;
CREATE POLICY "Authenticated users can manage plans." ON public.plans
FOR ALL TO authenticated USING (true);

-- Temporary: Disable RLS for testing (remove this line in production)
-- ALTER TABLE public.plans DISABLE ROW LEVEL SECURITY;

-- Insert default plans using your table structure
INSERT INTO public.plans (key, name, description, price, currency, billing_cycle, features, is_active) 
VALUES 
  (
    'basic',
    'Basic Plan',
    'Basic plan with essential features',
    '299.00',
    'THB',
    'monthly',
    '[
      {"feature_key": "line_chat", "unit": "flag", "value": null},
      {"feature_key": "rag_files", "unit": "files", "value": 3}
    ]'::jsonb,
    true
  ),
  (
    'standard',
    'Standard Plan',
    'Standard plan with enhanced features',
    '599.00',
    'THB',
    'monthly',
    '[
      {"feature_key": "line_chat", "unit": "flag", "value": null},
      {"feature_key": "facebook_chat", "unit": "flag", "value": null},
      {"feature_key": "rag_files", "unit": "files", "value": 5}
    ]'::jsonb,
    true
  ),
  (
    'enterprise',
    'Enterprise Plan',
    'Enterprise plan with all features',
    '1299.00',
    'THB',
    'monthly',
    '[
      {"feature_key": "line_chat", "unit": "flag", "value": null},
      {"feature_key": "facebook_chat", "unit": "flag", "value": null},
      {"feature_key": "calendar_agent", "unit": "flag", "value": null},
      {"feature_key": "gdrive_agent", "unit": "flag", "value": null},
      {"feature_key": "rag_files", "unit": "files", "value": 10}
    ]'::jsonb,
    true
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  billing_cycle = EXCLUDED.billing_cycle,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = now();