const { supabaseAdmin } = require('../config/database');
const { AppError, NotFoundError, ValidationError } = require('../utils/errors');
const storageService = require('./storageService');

/**
 * Flatten nested user/profile structure from Supabase response
 */
const flattenReelResponse = reel => {
  if (!reel) return reel;

  const { users, ...rest } = reel;
  return {
    ...rest,
    creator: users?.profiles || null,
  };
};

/**
 * Create a new reel
 * @param {string} userId - Creator's user ID
 * @param {Object} reelData - Reel information
 * @param {Object} videoFile - Video file object
 * @returns {Promise<Object>} Created reel
 */
const createReel = async (userId, reelData, videoFile) => {
  const { caption } = reelData;

  if (!videoFile) {
    throw new ValidationError('Video file is required');
  }

  // Upload video file
  const videoUrl = await storageService.uploadVideo(videoFile, userId);

  // Create reel record
  const { data: reel, error } = await supabaseAdmin
    .from('reels')
    .insert({
      user_id: userId,
      caption: caption?.trim() || null,
      video_url: videoUrl,
      is_active: true,
    })
    .select(
      `
      id,
      caption,
      video_url,
      view_count,
      like_count,
      is_active,
      created_at,
      user_id,
      users!inner (
        profiles!inner (
          username,
          display_name,
          artist_name,
          avatar_url
        )
      )
    `
    )
    .single();

  if (error) {
    // Clean up uploaded file if database insert fails
    await storageService.deleteFile(videoUrl);

    // eslint-disable-next-line no-console
    console.error('Error creating reel:', error);
    throw new AppError('Failed to create reel', 500);
  }

  return flattenReelResponse(reel);
};

/**
 * Get reel by ID
 * @param {string} reelId - Reel ID
 * @param {string} userId - Optional user ID for like status
 * @returns {Promise<Object>} Reel with details
 */
const getReelById = async (reelId, userId = null) => {
  const { data: reel, error } = await supabaseAdmin
    .from('reels')
    .select(
      `
      id,
      caption,
      video_url,
      view_count,
      like_count,
      is_active,
      created_at,
      user_id,
      users!inner (
        profiles!inner (
          username,
          display_name,
          artist_name,
          avatar_url
        )
      )
    `
    )
    .eq('id', reelId)
    .single();

  if (error || !reel) {
    throw new NotFoundError('Reel not found');
  }

  // Check if user has liked this reel
  if (userId) {
    const { data: like } = await supabaseAdmin
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('content_type', 'reel')
      .eq('content_id', reelId)
      .maybeSingle();

    reel.is_liked = !!like;
  }

  return flattenReelResponse(reel);
};

/**
 * Get chronological reel feed (paginated)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Reels and pagination info
 */
const getReelFeed = async (options = {}) => {
  const { page = 1, limit = 20, userId: _userId = null } = options;
  const offset = (page - 1) * limit;

  // Get total count
  const { count } = await supabaseAdmin
    .from('reels')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  // Get reels in chronological order
  const { data: reels, error } = await supabaseAdmin
    .from('reels')
    .select(
      `
      id,
      caption,
      video_url,
      view_count,
      like_count,
      created_at,
      user_id,
      users!inner (
        profiles!inner (
          username,
          display_name,
          artist_name,
          avatar_url
        )
      )
    `
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching reel feed:', error);
    throw new AppError('Failed to fetch reel feed', 500);
  }

  return {
    reels: reels.map(flattenReelResponse),
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
};

/**
 * Get reels by user ID
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} User's reels
 */
const getUserReels = async (userId, options = {}) => {
  const { page = 1, limit = 20, includeInactive = false } = options;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from('reels').select(
    `
      id,
      caption,
      video_url,
      view_count,
      like_count,
      is_active,
      created_at
    `
  );

  query = query.eq('user_id', userId);

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data: reels, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching user reels:', error);
    throw new AppError('Failed to fetch user reels', 500);
  }

  return reels;
};

/**
 * Update reel
 * @param {string} reelId - Reel ID
 * @param {string} userId - User ID (for ownership verification)
 * @param {Object} updates - Reel updates
 * @returns {Promise<Object>} Updated reel
 */
const updateReel = async (reelId, userId, updates) => {
  const { caption, is_active } = updates;

  const updateData = {};
  if (caption !== undefined) updateData.caption = caption?.trim() || null;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data: reel, error } = await supabaseAdmin
    .from('reels')
    .update(updateData)
    .eq('id', reelId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !reel) {
    throw new NotFoundError('Reel not found or unauthorized');
  }

  return reel;
};

/**
 * Delete reel
 * @param {string} reelId - Reel ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<void>}
 */
const deleteReel = async (reelId, userId) => {
  // Get reel to retrieve file URL
  const { data: reel } = await supabaseAdmin
    .from('reels')
    .select('video_url')
    .eq('id', reelId)
    .eq('user_id', userId)
    .single();

  if (!reel) {
    throw new NotFoundError('Reel not found or unauthorized');
  }

  // Delete from database
  const { error } = await supabaseAdmin
    .from('reels')
    .delete()
    .eq('id', reelId)
    .eq('user_id', userId);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error deleting reel:', error);
    throw new AppError('Failed to delete reel', 500);
  }

  // Delete file from storage
  await storageService.deleteFile(reel.video_url);
};

/**
 * Increment view count
 * @param {string} reelId - Reel ID
 * @returns {Promise<void>}
 */
const incrementViewCount = async reelId => {
  const { error } = await supabaseAdmin.rpc('increment_reel_view_count', {
    reel_id: reelId,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error incrementing view count:', error);
    // Don't throw error, just log it
  }
};

module.exports = {
  createReel,
  getReelById,
  getReelFeed,
  getUserReels,
  updateReel,
  deleteReel,
  incrementViewCount,
};
