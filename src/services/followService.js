const { supabaseAdmin } = require('../config/database');
const { AppError, ValidationError, NotFoundError } = require('../utils/errors');

/**
 * Follow a user
 * @param {string} followerId - User ID of follower
 * @param {string} followingId - User ID to follow
 * @returns {Promise<Object>} Follow relationship
 */
const followUser = async (followerId, followingId) => {
  if (followerId === followingId) {
    throw new ValidationError('You cannot follow yourself');
  }

  // Check if target user exists
  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', followingId)
    .single();

  if (!targetUser) {
    throw new NotFoundError('User not found');
  }

  // Check if already following
  const { data: existing } = await supabaseAdmin
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (existing) {
    throw new ValidationError('Already following this user');
  }

  // Create follow relationship
  const { data: follow, error } = await supabaseAdmin
    .from('follows')
    .insert({
      follower_id: followerId,
      following_id: followingId,
    })
    .select()
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error creating follow:', error);
    throw new AppError('Failed to follow user', 500);
  }

  return follow;
};

/**
 * Unfollow a user
 * @param {string} followerId - User ID of follower
 * @param {string} followingId - User ID to unfollow
 * @returns {Promise<void>}
 */
const unfollowUser = async (followerId, followingId) => {
  const { error } = await supabaseAdmin
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error unfollowing user:', error);
    throw new AppError('Failed to unfollow user', 500);
  }
};

/**
 * Check if user is following another user
 * @param {string} followerId - User ID of follower
 * @param {string} followingId - User ID being followed
 * @returns {Promise<boolean>} True if following
 */
const isFollowing = async (followerId, followingId) => {
  const { data: follow } = await supabaseAdmin
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  return !!follow;
};

/**
 * Get user's followers
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Followers list
 */
const getFollowers = async (userId, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  // Get total count
  const { count } = await supabaseAdmin
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('following_id', userId);

  // Get followers
  const { data: follows, error } = await supabaseAdmin
    .from('follows')
    .select(
      `
      follower_id,
      created_at,
      profiles!follows_follower_id_fkey (
        id,
        username,
        display_name,
        artist_name,
        avatar_url
      )
    `
    )
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching followers:', error);
    throw new AppError('Failed to fetch followers', 500);
  }

  const followers = follows.map(follow => ({
    ...follow.profiles,
    followed_at: follow.created_at,
  }));

  return {
    followers,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
};

/**
 * Get users that a user is following
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Following list
 */
const getFollowing = async (userId, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  // Get total count
  const { count } = await supabaseAdmin
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', userId);

  // Get following
  const { data: follows, error } = await supabaseAdmin
    .from('follows')
    .select(
      `
      following_id,
      created_at,
      profiles!follows_following_id_fkey (
        id,
        username,
        display_name,
        artist_name,
        avatar_url
      )
    `
    )
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching following:', error);
    throw new AppError('Failed to fetch following', 500);
  }

  const following = follows.map(follow => ({
    ...follow.profiles,
    followed_at: follow.created_at,
  }));

  return {
    following,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
};

/**
 * Get follower and following counts for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Counts
 */
const getFollowCounts = async userId => {
  const { data: followerCount } = await supabaseAdmin.rpc('get_follower_count', {
    user_id: userId,
  });

  const { data: followingCount } = await supabaseAdmin.rpc('get_following_count', {
    user_id: userId,
  });

  return {
    follower_count: followerCount || 0,
    following_count: followingCount || 0,
  };
};

module.exports = {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  getFollowCounts,
};
