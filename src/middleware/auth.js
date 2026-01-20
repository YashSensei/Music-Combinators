const { verifyToken, extractToken } = require('../config/auth');
const { AuthenticationError } = require('../utils/errors');

/**
 * Middleware to authenticate users via JWT token
 * Extracts and verifies Supabase JWT token from Authorization header
 */
const authenticate = async (req, res, next) => {
  try {
    // Skip auth in test environment if no token provided
    if (process.env.NODE_ENV === 'test' && !req.headers.authorization) {
      return next();
    }

    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    // Verify token using Supabase (now async)
    const user = await verifyToken(token);

    // Extract user info from Supabase user object
    req.user = {
      id: user.id,
      email: user.email,
      aud: user.aud,
      role: user.role || 'authenticated',
    };

    next();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('❌ Authentication error:', error.message);
    if (error instanceof AuthenticationError) {
      return next(error);
    }
    return next(new AuthenticationError(error.message));
  }
};

/**
 * Optional authentication middleware
 * Authenticates if token is present, but doesn't require it
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (token) {
      const user = await verifyToken(token);
      req.user = {
        id: user.id,
        email: user.email,
        aud: user.aud,
        role: user.role || 'authenticated',
      };
    }

    next();
  } catch {
    // For optional auth, ignore token errors and continue
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate,
};
