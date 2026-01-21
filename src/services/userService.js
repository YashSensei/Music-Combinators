const { supabaseAdmin } = require('../config/database');
const { USER_STATUSES } = require('../utils/constants');
const { NotFoundError, ConflictError, ValidationError } = require('../utils/errors');
const followService = require('./followService');

/**
 * Get user by ID with profile information
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User with profile data
 */
const getUserById = async userId => {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(
      `
      id,
      role,
      status,
      approved_at,
      created_at,
      profiles (
        username,
        display_name,
        bio,
        avatar_url,
        artist_name,
        created_at
      )
    `
    )
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('User not found');
    }
    throw error;
  }

  return data;
};

/**
 * Get user by username
 * @param {string} username - Username to search for
 * @returns {Promise<Object>} User with profile data
 */
const getUserByUsername = async username => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(
      `
      username,
      display_name,
      bio,
      avatar_url,
      artist_name,
      created_at,
      users (
        id,
        role,
        status,
        approved_at,
        created_at
      )
    `
    )
    .eq('username', username)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('User not found');
    }
    throw error;
  }

  return {
    ...data.users,
    profiles: {
      username: data.username,
      display_name: data.display_name,
      bio: data.bio,
      avatar_url: data.avatar_url,
      artist_name: data.artist_name,
      created_at: data.created_at,
    },
  };
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Updated profile
 */
const updateUserProfile = async (userId, profileData) => {
  // Validate username uniqueness if being updated
  if (profileData.username) {
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', profileData.username)
      .neq('id', userId)
      .single();

    if (existingUser) {
      throw new ConflictError('Username already taken');
    }
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(profileData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ConflictError('Username already taken');
    }
    throw error;
  }

  return data;
};

/**
 * Search users by username or artist name
 * @param {string} query - Search query
 * @param {Object} options - Search options (limit, offset)
 * @returns {Promise<Array>} Array of matching users
 */
const searchUsers = async (query, options = {}) => {
  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(
      `
      username,
      display_name,
      bio,
      avatar_url,
      artist_name,
      created_at,
      users!inner (
        id,
        role,
        status
      )
    `
    )
    .or(`username.ilike.%${query}%,artist_name.ilike.%${query}%`)
    .eq('users.status', USER_STATUSES.ACTIVE)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data.map(profile => ({
    ...profile.users,
    profiles: {
      username: profile.username,
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      artist_name: profile.artist_name,
      created_at: profile.created_at,
    },
  }));
};

/**
 * Get waitlisted users (admin only)
 * @param {Object} options - Query options (limit, offset)
 * @returns {Promise<Array>} Array of waitlisted users
 */
const getWaitlistedUsers = async (options = {}) => {
  const { limit = 20, offset = 0 } = options;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select(
      `
      id,
      role,
      status,
      created_at,
      profiles (
        username,
        display_name,
        bio,
        avatar_url
      )
    `
    )
    .eq('status', USER_STATUSES.WAITLISTED)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Approve users from waitlist (admin only)
 * @param {Array<string>} userIds - Array of user IDs to approve
 * @returns {Promise<Array>} Array of approved users
 */
const approveUsers = async userIds => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new ValidationError('User IDs array is required');
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({
      status: USER_STATUSES.ACTIVE,
      approved_at: new Date().toISOString(),
    })
    .in('id', userIds)
    .eq('status', USER_STATUSES.WAITLISTED)
    .select();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Update user status (admin only)
 * @param {string} userId - User ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated user
 */
const updateUserStatus = async (userId, status) => {
  if (!Object.values(USER_STATUSES).includes(status)) {
    throw new ValidationError('Invalid user status');
  }

  const updateData = { status };
  if (status === USER_STATUSES.ACTIVE) {
    updateData.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('User not found');
    }
    throw error;
  }

  return data;
};

/**
 * Get user statistics (admin only)
 * @returns {Promise<Object>} User statistics
 */
const getUserStats = async () => {
  const { data, error } = await supabaseAdmin.rpc('get_user_stats');

  if (error) {
    throw error;
  }

  return data[0];
};

/**
 * Get public user profile by ID (for viewing other users)
 * @param {string} userId - User ID
 * @param {string} viewerId - Optional viewer ID to check follow status
 * @returns {Promise<Object>} Public user profile with counts
 */
const getPublicProfile = async (userId, viewerId = null) => {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select(
      `
      id,
      role,
      status,
      created_at,
      profiles (
        username,
        display_name,
        bio,
        avatar_url,
        artist_name
      )
    `
    )
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('User not found');
    }
    throw error;
  }

  // Get follower/following counts
  const counts = await followService.getFollowCounts(userId);

  // Check if viewer is following this user
  let is_following = false;
  if (viewerId && viewerId !== userId) {
    is_following = await followService.isFollowing(viewerId, userId);
  }

  return {
    ...user,
    ...counts,
    is_following,
  };
};

module.exports = {
  getUserById,
  getUserByUsername,
  updateUserProfile,
  searchUsers,
  getWaitlistedUsers,
  approveUsers,
  updateUserStatus,
  getUserStats,
  getPublicProfile,
};
