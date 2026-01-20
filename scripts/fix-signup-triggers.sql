-- Fix the signup triggers to handle errors gracefully
-- Run this in your Supabase SQL Editor

-- First, drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create a more robust function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_username text;
BEGIN
    -- Extract username from metadata or generate one
    user_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        'user_' || substr(NEW.id::text, 1, 8)
    );

    -- Insert into users table (ignore conflicts)
    INSERT INTO public.users (id, role, status, created_at)
    VALUES (
        NEW.id,
        'listener'::user_role,
        'waitlisted'::user_status,
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Insert into profiles table (ignore conflicts)
    INSERT INTO public.profiles (id, username, display_name, created_at)
    VALUES (
        NEW.id,
        user_username,
        COALESCE(NEW.raw_user_meta_data->>'display_name', user_username),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the signup
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Make sure RLS policies allow the trigger to work
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow service role to bypass RLS for triggers
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;