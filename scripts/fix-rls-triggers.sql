-- CRITICAL FIX: Allow trigger to create users and profiles
-- Run this in Supabase SQL Editor to fix 500 signup errors

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger 
SECURITY DEFINER  -- This is the KEY - bypasses RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_username text;
BEGIN
  -- Extract username from metadata or generate one
  user_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || substr(NEW.id::text, 1, 8)
  );

  -- Insert into users table
  INSERT INTO public.users (id, role, status, created_at)
  VALUES (
    NEW.id,
    'listener'::user_role,
    'waitlisted'::user_status,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert into profiles table
  INSERT INTO public.profiles (id, username, display_name, created_at)
  VALUES (
    NEW.id,
    user_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', user_username),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- Allow authenticated users to read public profiles
CREATE POLICY "Public profiles are viewable by all" ON profiles
  FOR SELECT USING (true);

-- Allow users to insert their own profile (for trigger)
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can insert users" ON users
  FOR INSERT WITH CHECK (true);