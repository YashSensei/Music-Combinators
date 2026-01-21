const { supabaseAdmin } = require('../config/database');
const { AppError, ValidationError } = require('../utils/errors');

/**
 * Toggle like on content (track or reel)
 * @param {string} userId - User ID
 * @param {string} contentType - 'track' or 'reel'
 * @param {string} contentId - Content ID
 * @returns {Promise<Object>} Like status
 */
const toggleLike = async (userId, contentType, contentId) => {
  if (!['track', 'reel'].includes(contentType)) {
    throw new ValidationError('Invalid content type. Must be "track" or "reel"');
  }

  // Check if already liked
  const { data: existingLike } = await supabaseAdmin
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .maybeSingle();

  if (existingLike) {
    // Unlike - remove the like
    const { error } = await supabaseAdmin.from('likes').delete().eq('id', existingLike.id);

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error removing like:', error);
      throw new AppError('Failed to unlike content', 500);
    }

    return { liked: false };
  } else {
    // Like - add new like
    const { error } = await supabaseAdmin.from('likes').insert({
      user_id: userId,
      content_type: contentType,
      content_id: contentId,
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Error adding like:', error);
      throw new AppError('Failed to like content', 500);
    }

    return { liked: true };
  }
};

/**
 * Check if user has liked content
 * @param {string} userId - User ID
 * @param {string} contentType - 'track' or 'reel'
 * @param {string} contentId - Content ID
 * @returns {Promise<boolean>} True if liked
 */
const isLiked = async (userId, contentType, contentId) => {
  const { data: like } = await supabaseAdmin
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .maybeSingle();

  return !!like;
};

/**
 * Get user's liked tracks
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Liked tracks
 */
const getUserLikedTracks = async (userId, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const { data: likes, error } = await supabaseAdmin
    .from('likes')
    .select(
      `
      content_id,
      created_at,
      tracks!inner (
        id,
        title,
        audio_url,
        cover_url,
        duration,
        play_count,
        like_count,
        created_at,
        user_id,
        profiles!inner (
          username,
          display_name,
          artist_name,
          avatar_url
        )
      )
    `
    )
    .eq('user_id', userId)
    .eq('content_type', 'track')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching liked tracks:', error);
    throw new AppError('Failed to fetch liked tracks', 500);
  }

  const tracks = likes.map(like => ({
    ...like.tracks,
    liked_at: like.created_at,
  }));

  return tracks;
};

/**
 * Get user's liked reels
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Liked reels
 */
const getUserLikedReels = async (userId, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  const { data: likes, error } = await supabaseAdmin
    .from('likes')
    .select(
      `
      content_id,
      created_at,
      reels!inner (
        id,
        caption,
        video_url,
        view_count,
        like_count,
        created_at,
        user_id,
        profiles!inner (
          username,
          display_name,
          artist_name,
          avatar_url
        )
      )
    `
    )
    .eq('user_id', userId)
    .eq('content_type', 'reel')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching liked reels:', error);
    throw new AppError('Failed to fetch liked reels', 500);
  }

  const reels = likes.map(like => ({
    ...like.reels,
    liked_at: like.created_at,
  }));

  return reels;
};

module.exports = {
  toggleLike,
  isLiked,
  getUserLikedTracks,
  getUserLikedReels,
};
