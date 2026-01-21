const { supabaseAdmin } = require('../config/database');
const { AppError, NotFoundError, ValidationError } = require('../utils/errors');
const storageService = require('./storageService');

/**
 * Flatten nested user/profile structure from Supabase response
 */
const flattenTrackResponse = track => {
  if (!track) return track;

  const { users, ...rest } = track;
  return {
    ...rest,
    creator: users?.profiles || null,
  };
};

/**
 * Create a new track
 * @param {string} userId - Creator's user ID
 * @param {Object} trackData - Track information
 * @param {Object} audioFile - Audio file object
 * @param {Object} coverFile - Optional cover image file
 * @returns {Promise<Object>} Created track
 */
const createTrack = async (userId, trackData, audioFile, coverFile = null) => {
  const { title, duration } = trackData;

  if (!title || title.trim().length === 0) {
    throw new ValidationError('Track title is required');
  }

  if (!audioFile) {
    throw new ValidationError('Audio file is required');
  }

  // Upload audio file
  const audioUrl = await storageService.uploadAudio(audioFile, userId);

  // Upload cover image if provided
  let coverUrl = null;
  if (coverFile) {
    coverUrl = await storageService.uploadImage(coverFile, userId);
  }

  // Create track record
  const { data: track, error } = await supabaseAdmin
    .from('tracks')
    .insert({
      user_id: userId,
      title: title.trim(),
      audio_url: audioUrl,
      cover_url: coverUrl,
      duration: duration || null,
      is_active: true,
    })
    .select(
      `
      id,
      title,
      audio_url,
      cover_url,
      duration,
      play_count,
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
    // Clean up uploaded files if database insert fails
    await storageService.deleteFile(audioUrl);
    if (coverUrl) await storageService.deleteFile(coverUrl);

    // eslint-disable-next-line no-console
    console.error('Error creating track:', error);
    throw new AppError('Failed to create track', 500);
  }

  return flattenTrackResponse(track);
};

/**
 * Get track by ID
 * @param {string} trackId - Track ID
 * @param {string} userId - Optional user ID for like status
 * @returns {Promise<Object>} Track with details
 */
const getTrackById = async (trackId, userId = null) => {
  const { data: track, error } = await supabaseAdmin
    .from('tracks')
    .select(
      `
      id,
      title,
      audio_url,
      cover_url,
      duration,
      play_count,
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
    .eq('id', trackId)
    .single();

  if (error || !track) {
    throw new NotFoundError('Track not found');
  }

  // Check if user has liked this track
  if (userId) {
    const { data: like } = await supabaseAdmin
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('content_type', 'track')
      .eq('content_id', trackId)
      .maybeSingle();

    track.is_liked = !!like;
  }

  return flattenTrackResponse(track);
};

/**
 * Get all tracks (paginated)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Tracks and pagination info
 */
const getAllTracks = async (options = {}) => {
  const { page = 1, limit = 20, userId: _userId = null } = options;
  const offset = (page - 1) * limit;

  // Get total count
  const { count } = await supabaseAdmin
    .from('tracks')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  // Get tracks
  const { data: tracks, error } = await supabaseAdmin
    .from('tracks')
    .select(
      `
      id,
      title,
      audio_url,
      cover_url,
      duration,
      play_count,
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
    console.error('Error fetching tracks:', error);
    throw new AppError('Failed to fetch tracks', 500);
  }

  return {
    tracks: tracks.map(flattenTrackResponse),
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
};

/**
 * Search tracks by title
 * @param {string} query - Search query
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Search results
 */
const searchTracks = async (query, options = {}) => {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  if (!query || query.trim().length === 0) {
    return getAllTracks({ page, limit });
  }

  const searchTerm = `%${query.trim()}%`;

  const { data: tracks, error } = await supabaseAdmin
    .from('tracks')
    .select(
      `
      id,
      title,
      audio_url,
      cover_url,
      duration,
      play_count,
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
    .ilike('title', searchTerm)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error searching tracks:', error);
    throw new AppError('Failed to search tracks', 500);
  }

  return {
    tracks: tracks.map(flattenTrackResponse),
    pagination: {
      page,
      limit,
      total: tracks.length,
    },
  };
};

/**
 * Get tracks by user ID
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} User's tracks
 */
const getUserTracks = async (userId, options = {}) => {
  const { page = 1, limit = 20, includeInactive = false } = options;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin.from('tracks').select(
    `
      id,
      title,
      audio_url,
      cover_url,
      duration,
      play_count,
      like_count,
      is_active,
      created_at
    `
  );

  query = query.eq('user_id', userId);

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data: tracks, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching user tracks:', error);
    throw new AppError('Failed to fetch user tracks', 500);
  }

  return tracks;
};

/**
 * Update track
 * @param {string} trackId - Track ID
 * @param {string} userId - User ID (for ownership verification)
 * @param {Object} updates - Track updates
 * @returns {Promise<Object>} Updated track
 */
const updateTrack = async (trackId, userId, updates) => {
  const { title, is_active } = updates;

  const updateData = {};
  if (title !== undefined) updateData.title = title.trim();
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data: track, error } = await supabaseAdmin
    .from('tracks')
    .update(updateData)
    .eq('id', trackId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !track) {
    throw new NotFoundError('Track not found or unauthorized');
  }

  return track;
};

/**
 * Delete track
 * @param {string} trackId - Track ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<void>}
 */
const deleteTrack = async (trackId, userId) => {
  // Get track to retrieve file URLs
  const { data: track } = await supabaseAdmin
    .from('tracks')
    .select('audio_url, cover_url')
    .eq('id', trackId)
    .eq('user_id', userId)
    .single();

  if (!track) {
    throw new NotFoundError('Track not found or unauthorized');
  }

  // Delete from database
  const { error } = await supabaseAdmin
    .from('tracks')
    .delete()
    .eq('id', trackId)
    .eq('user_id', userId);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error deleting track:', error);
    throw new AppError('Failed to delete track', 500);
  }

  // Delete files from storage
  await storageService.deleteFile(track.audio_url);
  if (track.cover_url) {
    await storageService.deleteFile(track.cover_url);
  }
};

/**
 * Increment play count
 * @param {string} trackId - Track ID
 * @returns {Promise<void>}
 */
const incrementPlayCount = async trackId => {
  const { error } = await supabaseAdmin.rpc('increment_track_play_count', {
    track_id: trackId,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error incrementing play count:', error);
    // Don't throw error, just log it
  }
};

module.exports = {
  createTrack,
  getTrackById,
  getAllTracks,
  searchTracks,
  getUserTracks,
  updateTrack,
  deleteTrack,
  incrementPlayCount,
};
