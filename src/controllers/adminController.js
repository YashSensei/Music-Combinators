const adminService = require('../services/adminService');
const trackService = require('../services/trackService');
const reelService = require('../services/reelService');

/**
 * Get waitlisted users
 */
const getWaitlistedUsers = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await adminService.getWaitlistedUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve single user from waitlist
 */
const approveUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.approveUser(id);

    res.json({
      success: true,
      message: 'User approved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Batch approve users from waitlist
 */
const batchApproveUsers = async (req, res, next) => {
  try {
    const { count } = req.body;

    if (!count || count < 1) {
      return res.status(400).json({
        success: false,
        message: 'Count is required and must be at least 1',
      });
    }

    const result = await adminService.batchApproveUsers(count);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending creator applications
 */
const getCreatorApplications = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await adminService.getCreatorApplications({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve creator application
 */
const approveCreatorApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.approveCreatorApplication(id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject creator application
 */
const rejectCreatorApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const result = await adminService.rejectCreatorApplication(id, reason);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get platform statistics
 */
const getPlatformStats = async (req, res, next) => {
  try {
    const stats = await adminService.getPlatformStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete track (content moderation)
 */
const deleteTrack = async (req, res, next) => {
  try {
    const { id } = req.params;
    await trackService.deleteTrack(id, req.user.id); // Admin can delete any track

    res.json({
      success: true,
      message: 'Track deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete reel (content moderation)
 */
const deleteReel = async (req, res, next) => {
  try {
    const { id } = req.params;
    await reelService.deleteReel(id, req.user.id); // Admin can delete any reel

    res.json({
      success: true,
      message: 'Reel deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ban user
 */
const banUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Prevent self-ban
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot ban yourself',
      });
    }

    const { supabaseAdmin } = require('../config/database');

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        status: 'banned',
        ban_reason: reason || null,
        banned_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, status, profiles!inner(username)')
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'User banned successfully',
      data: {
        id: data.id,
        status: data.status,
        username: data.profiles.username,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Unban user
 */
const unbanUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { supabaseAdmin } = require('../config/database');

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        status: 'active',
        ban_reason: null,
        banned_at: null,
      })
      .eq('id', id)
      .eq('status', 'banned')
      .select('id, status, profiles!inner(username)')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'User not found or not banned',
        });
      }
      throw error;
    }

    res.json({
      success: true,
      message: 'User unbanned successfully',
      data: {
        id: data.id,
        status: data.status,
        username: data.profiles.username,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWaitlistedUsers,
  approveUser,
  batchApproveUsers,
  getCreatorApplications,
  approveCreatorApplication,
  rejectCreatorApplication,
  getPlatformStats,
  deleteTrack,
  deleteReel,
  banUser,
  unbanUser,
};
