-- Phase 4 Schema Updates: Admin Panel Features
-- Add fields for user banning and creator application rejection reasons

-- Add ban-related columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS ban_reason TEXT,
ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;

-- Add rejection reason to creator applications
ALTER TABLE creator_applications
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index on banned_at for quick filtering
CREATE INDEX IF NOT EXISTS idx_users_banned_at ON users(banned_at) WHERE banned_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.ban_reason IS 'Admin-provided reason for banning the user';
COMMENT ON COLUMN users.banned_at IS 'Timestamp when the user was banned';
COMMENT ON COLUMN creator_applications.rejection_reason IS 'Admin-provided reason for rejecting the creator application';
