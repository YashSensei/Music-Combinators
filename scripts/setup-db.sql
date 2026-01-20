-- Music Combinators Database Schema
-- This script sets up the complete database schema for the MVP

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types for enums
CREATE TYPE user_role AS ENUM ('listener', 'creator', 'admin');
CREATE TYPE user_status AS ENUM ('waitlisted', 'active', 'banned');
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE content_type AS ENUM ('track', 'reel');

-- Users table (extends auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'listener',
  status user_status NOT NULL DEFAULT 'waitlisted',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles table (user display data)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  artist_name VARCHAR(100), -- Only for creators
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Creator applications table
CREATE TABLE creator_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_name VARCHAR(100) NOT NULL,
  bio TEXT NOT NULL,
  spotify_url TEXT,
  instagram_url TEXT,
  status application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Tracks table (music uploads)
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  duration INTEGER, -- in seconds
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reels table (video uploads)
CREATE TABLE reels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption TEXT,
  video_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Likes table (engagement data)
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one like per user per content item
  UNIQUE(user_id, content_type, content_id)
);

-- Settings table (admin configuration)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_artist_name ON profiles(artist_name) WHERE artist_name IS NOT NULL;
CREATE INDEX idx_tracks_title ON tracks(title);
CREATE INDEX idx_tracks_user_id ON tracks(user_id);
CREATE INDEX idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX idx_reels_user_id ON reels(user_id);
CREATE INDEX idx_reels_created_at ON reels(created_at DESC);
CREATE INDEX idx_likes_user_content ON likes(user_id, content_type, content_id);
CREATE INDEX idx_likes_content ON likes(content_type, content_id);
CREATE INDEX idx_creator_applications_status ON creator_applications(status);
CREATE INDEX idx_creator_applications_user_id ON creator_applications(user_id);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('onboarding_batch_size', '10'),
  ('max_active_users', '100');

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view own profile data" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Creator applications
CREATE POLICY "Users can view own applications" ON creator_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications" ON creator_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Content visibility (active content is public, inactive is owner-only)
CREATE POLICY "Active tracks are publicly visible" ON tracks
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view own tracks" ON tracks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Active reels are publicly visible" ON reels
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view own reels" ON reels
  FOR SELECT USING (auth.uid() = user_id);

-- Creators can manage their content
CREATE POLICY "Creators can insert tracks" ON tracks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'creator' 
      AND status = 'active'
    )
  );

CREATE POLICY "Creators can insert reels" ON reels
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'creator' 
      AND status = 'active'
    )
  );

-- Users can manage their likes
CREATE POLICY "Users can view own likes" ON likes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create likes" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- Admin policies (settings table)
CREATE POLICY "Admins can manage settings" ON settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND status = 'active'
    )
  );

-- Functions for common operations
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into users table
  INSERT INTO users (id) VALUES (NEW.id);
  
  -- Create default profile
  INSERT INTO profiles (id, username) 
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)));
  
  RETURN NEW;
END;
$$ language plpgsql security definer;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to get user stats (for admin dashboard)
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  waitlisted_users BIGINT,
  active_listeners BIGINT,
  active_creators BIGINT,
  pending_applications BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE status = 'waitlisted') as waitlisted_users,
    (SELECT COUNT(*) FROM users WHERE status = 'active' AND role = 'listener') as active_listeners,
    (SELECT COUNT(*) FROM users WHERE status = 'active' AND role = 'creator') as active_creators,
    (SELECT COUNT(*) FROM creator_applications WHERE status = 'pending') as pending_applications;
END;
$$ language plpgsql security definer;