-- Phase 3 Schema Updates: Add traction features (follows, view/play counts)
-- Run this after setup-db.sql to add minimal traction tracking

-- Add play_count and like_count to tracks table
ALTER TABLE tracks 
ADD COLUMN play_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;

-- Add view_count and like_count to reels table
ALTER TABLE reels 
ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;

-- Create follows table for user-to-user relationships
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one follow relationship per user pair
  UNIQUE(follower_id, following_id),
  
  -- Prevent self-follows
  CHECK (follower_id != following_id)
);

-- Create indexes for efficient follower/following queries
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_follows_created_at ON follows(created_at DESC);

-- Enable RLS on follows table
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- RLS policies for follows
CREATE POLICY "Anyone can view follows" ON follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON follows
  FOR INSERT WITH CHECK (
    auth.uid() = follower_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND status = 'active'
    )
  );

CREATE POLICY "Users can unfollow" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Update profiles to allow public viewing (needed for follower/following lists)
DROP POLICY IF EXISTS "Users can view own profile data" ON profiles;
CREATE POLICY "Profiles are publicly viewable" ON profiles
  FOR SELECT USING (true);

-- Function to increment play count on tracks
CREATE OR REPLACE FUNCTION increment_track_play_count(track_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE tracks 
  SET play_count = play_count + 1 
  WHERE id = track_id AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment view count on reels
CREATE OR REPLACE FUNCTION increment_reel_view_count(reel_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE reels 
  SET view_count = view_count + 1 
  WHERE id = reel_id AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update like count when likes change
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.content_type = 'track' THEN
      UPDATE tracks SET like_count = like_count + 1 WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'reel' THEN
      UPDATE reels SET like_count = like_count + 1 WHERE id = NEW.content_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.content_type = 'track' THEN
      UPDATE tracks SET like_count = like_count - 1 WHERE id = OLD.content_id;
    ELSIF OLD.content_type = 'reel' THEN
      UPDATE reels SET like_count = like_count - 1 WHERE id = OLD.content_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update like counts
DROP TRIGGER IF EXISTS update_like_count_trigger ON likes;
CREATE TRIGGER update_like_count_trigger
AFTER INSERT OR DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION update_like_count();

-- Add follower/following count functions for profiles
CREATE OR REPLACE FUNCTION get_follower_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM follows WHERE following_id = user_id);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_following_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM follows WHERE follower_id = user_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_track_play_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_reel_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_follower_count(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_following_count(UUID) TO authenticated, anon;
