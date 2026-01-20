const userService = require('../services/userService');
const { ValidationError } = require('../utils/errors');
const { PAGINATION } = require('../utils/constants');

/**
 * Get current user profile
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user.id);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { username, display_name, bio, avatar_url, artist_name } = req.body;

    // Validate input
    if (username !== undefined) {
      if (!username || username.length < 3 || username.length > 50) {
        throw new ValidationError('Username must be between 3 and 50 characters');
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new ValidationError('Username can only contain letters, numbers, and underscores');
      }
    }

    if (display_name !== undefined && display_name.length > 100) {
      throw new ValidationError('Display name cannot exceed 100 characters');
    }

    if (bio !== undefined && bio.length > 1000) {
      throw new ValidationError('Bio cannot exceed 1000 characters');
    }

    // Only creators can set artist_name
    if (artist_name !== undefined && req.userDetails?.role !== 'creator') {
      throw new ValidationError('Only creators can set artist name');
    }

    if (artist_name !== undefined && artist_name.length > 100) {
      throw new ValidationError('Artist name cannot exceed 100 characters');
    }

    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (display_name !== undefined) updateData.display_name = display_name;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (artist_name !== undefined) updateData.artist_name = artist_name;

    const updatedProfile = await userService.updateUserProfile(req.user.id, updateData);

    res.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search users
 */
const searchUsers = async (req, res, next) => {
  try {
    const { q: query } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT
    );
    const offset = (page - 1) * limit;

    if (!query || query.trim().length < 2) {
      throw new ValidationError('Search query must be at least 2 characters');
    }

    const users = await userService.searchUsers(query.trim(), { limit, offset });

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total: users.length, // Note: This is not the total count, just current page count
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by username (public endpoint)
 */
const getUserByUsername = async (req, res, next) => {
  try {
    const { username } = req.params;

    if (!username || username.length < 3) {
      throw new ValidationError('Invalid username');
    }

    const user = await userService.getUserByUsername(username);

    // Only return public information
    const publicUser = {
      id: user.id,
      role: user.role,
      profiles: {
        username: user.profiles.username,
        display_name: user.profiles.display_name,
        bio: user.profiles.bio,
        avatar_url: user.profiles.avatar_url,
        artist_name: user.profiles.artist_name,
        created_at: user.profiles.created_at,
      },
    };

    res.json({
      success: true,
      data: publicUser,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentUser,
  updateProfile,
  searchUsers,
  getUserByUsername,
};
