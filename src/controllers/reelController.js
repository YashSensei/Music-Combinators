const reelService = require('../services/reelService');
const likeService = require('../services/likeService');
const { ValidationError } = require('../utils/errors');

/**
 * Create a new reel
 * @route POST /api/reels
 */
const createReel = async (req, res, next) => {
  try {
    const { caption } = req.body;
    const videoFile = req.file; // single file, not files array

    if (!videoFile) {
      throw new ValidationError('Video file is required');
    }

    const reel = await reelService.createReel(req.user.id, { caption }, videoFile);

    res.status(201).json({
      success: true,
      data: reel,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reel by ID
 * @route GET /api/reels/:id
 */
const getReel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const reel = await reelService.getReelById(id, userId);

    res.status(200).json({
      success: true,
      data: reel,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reel feed (chronological)
 * @route GET /api/reels/feed
 */
const getReelFeed = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const userId = req.user?.id;

    const result = await reelService.getReelFeed({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      userId,
    });

    res.status(200).json({
      success: true,
      data: result.reels,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's reels
 * @route GET /api/reels/user/:userId
 */
const getUserReels = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page, limit } = req.query;

    const reels = await reelService.getUserReels(userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });

    res.status(200).json({
      success: true,
      data: reels,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update reel
 * @route PUT /api/reels/:id
 */
const updateReel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const reel = await reelService.updateReel(id, req.user.id, updates);

    res.status(200).json({
      success: true,
      data: reel,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete reel
 * @route DELETE /api/reels/:id
 */
const deleteReel = async (req, res, next) => {
  try {
    const { id } = req.params;

    await reelService.deleteReel(id, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Reel deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Increment view count
 * @route POST /api/reels/:id/view
 */
const viewReel = async (req, res, next) => {
  try {
    const { id } = req.params;

    await reelService.incrementViewCount(id);

    res.status(200).json({
      success: true,
      message: 'View count incremented',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle like on reel
 * @route POST /api/reels/:id/like
 */
const toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await likeService.toggleLike(req.user.id, 'reel', id);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReel,
  getReel,
  getReelFeed,
  getUserReels,
  updateReel,
  deleteReel,
  viewReel,
  toggleLike,
};
