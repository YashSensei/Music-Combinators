-- Create admin user directly in Supabase
-- Run this in your Supabase SQL Editor

-- First, create an auth user (you'll need to do this via Supabase Auth API or dashboard)
-- Then run this SQL to make them an admin:

-- Step 1: Find your user ID after creating admin via Supabase Auth
-- Step 2: Update their role to admin
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@music-combinators.com';

-- Step 3: Insert into our users table
INSERT INTO public.users (id, role, status, approved_at)
SELECT 
  id,
  'admin'::user_role,
  'active'::user_status,
  NOW()
FROM auth.users 
WHERE email = 'admin@music-combinators.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  status = 'active',
  approved_at = NOW();

-- Step 4: Create admin profile
INSERT INTO public.profiles (id, username, display_name)
SELECT 
  id,
  'admin',
  'System Administrator'
FROM auth.users 
WHERE email = 'admin@music-combinators.com'
ON CONFLICT (id) DO UPDATE SET
  username = 'admin',
  display_name = 'System Administrator';