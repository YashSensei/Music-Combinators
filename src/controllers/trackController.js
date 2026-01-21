const trackService = require('../services/trackService');
const likeService = require('../services/likeService');
const { ValidationError } = require('../utils/errors');

/**
 * Create a new track
 * @route POST /api/tracks
 */
const createTrack = async (req, res, next) => {
  try {
    const { title, duration } = req.body;
    const audioFile = req.files?.audio?.[0];
    const coverFile = req.files?.cover?.[0];

    if (!audioFile) {
      throw new ValidationError('Audio file is required');
    }

    const track = await trackService.createTrack(
      req.user.id,
      { title, duration: duration ? parseInt(duration) : null },
      audioFile,
      coverFile
    );

    res.status(201).json({
      success: true,
      data: track,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get track by ID
 * @route GET /api/tracks/:id
 */
const getTrack = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const track = await trackService.getTrackById(id, userId);

    res.status(200).json({
      success: true,
      data: track,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all tracks (paginated)
 * @route GET /api/tracks
 */
const getAllTracks = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const userId = req.user?.id;

    const result = await trackService.getAllTracks({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      userId,
    });

    res.status(200).json({
      success: true,
      data: result.tracks,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search tracks
 * @route GET /api/tracks/search
 */
const searchTracks = async (req, res, next) => {
  try {
    const { q, page, limit } = req.query;

    const result = await trackService.searchTracks(q, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });

    res.status(200).json({
      success: true,
      data: result.tracks,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's tracks
 * @route GET /api/tracks/user/:userId
 */
const getUserTracks = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page, limit } = req.query;

    const tracks = await trackService.getUserTracks(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });

    res.status(200).json({
      success: true,
      data: tracks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update track
 * @route PUT /api/tracks/:id
 */
const updateTrack = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const track = await trackService.updateTrack(id, req.user.id, updates);

    res.status(200).json({
      success: true,
      data: track,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete track
 * @route DELETE /api/tracks/:id
 */
const deleteTrack = async (req, res, next) => {
  try {
    const { id } = req.params;

    await trackService.deleteTrack(id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Track deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Increment play count
 * @route POST /api/tracks/:id/play
 */
const playTrack = async (req, res, next) => {
  try {
    const { id } = req.params;

    await trackService.incrementPlayCount(id);

    res.status(200).json({
      success: true,
      message: 'Play count incremented',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle like on track
 * @route POST /api/tracks/:id/like
 */
const toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await likeService.toggleLike(req.user.id, 'track', id);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTrack,
  getTrack,
  getAllTracks,
  searchTracks,
  getUserTracks,
  updateTrack,
  deleteTrack,
  playTrack,
  toggleLike,
};
