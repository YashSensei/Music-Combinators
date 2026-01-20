const { supabaseAdmin } = require('../config/database');
const { AuthorizationError } = require('../utils/errors');
const { USER_ROLES, USER_STATUSES } = require('../utils/constants');

/**
 * Get user details from database
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User details with role and status
 */
const getUserDetails = async userId => {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured');
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, role, status, approved_at')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // User not found
      return null;
    }
    throw error;
  }

  return data;
};

/**
 * Middleware to check if user has required role
 * @param {Array<string>} allowedRoles - Array of allowed user roles
 * @returns {Function} Express middleware function
 */
const requireRole = allowedRoles => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      // Get user details from database
      const userDetails = await getUserDetails(req.user.id);

      if (!userDetails) {
        throw new AuthorizationError('User not found');
      }

      // Check if user has required role
      if (!allowedRoles.includes(userDetails.role)) {
        throw new AuthorizationError('Insufficient permissions');
      }

      // Attach user details to request
      req.userDetails = userDetails;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user is active
 * @returns {Function} Express middleware function
 */
const requireActive = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      // Get user details from database
      const userDetails = await getUserDetails(req.user.id);

      if (!userDetails) {
        throw new AuthorizationError('User not found');
      }

      // Check if user is active
      if (userDetails.status !== USER_STATUSES.ACTIVE) {
        if (userDetails.status === USER_STATUSES.WAITLISTED) {
          throw new AuthorizationError('Account pending approval');
        }
        if (userDetails.status === USER_STATUSES.BANNED) {
          throw new AuthorizationError('Account has been banned');
        }
        throw new AuthorizationError('Account not active');
      }

      // Attach user details to request
      req.userDetails = userDetails;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user is active and has required role
 * @param {Array<string>} allowedRoles - Array of allowed user roles
 * @returns {Function} Express middleware function
 */
const requireActiveRole = allowedRoles => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      // Get user details from database
      const userDetails = await getUserDetails(req.user.id);

      if (!userDetails) {
        throw new AuthorizationError('User not found');
      }

      // Check if user is active
      if (userDetails.status !== USER_STATUSES.ACTIVE) {
        if (userDetails.status === USER_STATUSES.WAITLISTED) {
          throw new AuthorizationError('Account pending approval');
        }
        if (userDetails.status === USER_STATUSES.BANNED) {
          throw new AuthorizationError('Account has been banned');
        }
        throw new AuthorizationError('Account not active');
      }

      // Check if user has required role
      if (!allowedRoles.includes(userDetails.role)) {
        throw new AuthorizationError('Insufficient permissions');
      }

      // Attach user details to request
      req.userDetails = userDetails;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Convenience middleware for common role checks
const requireAdmin = () => requireActiveRole([USER_ROLES.ADMIN]);
const requireCreator = () => requireActiveRole([USER_ROLES.CREATOR]);
const requireCreatorOrAdmin = () => requireActiveRole([USER_ROLES.CREATOR, USER_ROLES.ADMIN]);

module.exports = {
  getUserDetails,
  requireRole,
  requireActive,
  requireActiveRole,
  requireAdmin,
  requireCreator,
  requireCreatorOrAdmin,
};
