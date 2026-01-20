const { createClient } = require('@supabase/supabase-js');

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} JWT token or null
 */
const extractToken = authHeader => {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Verify JWT token by creating a temporary Supabase client with the token
 * This is the correct way to verify Supabase JWTs on the server side
 * @param {string} token - JWT token from Authorization header
 * @returns {Object} User object from Supabase
 */
const verifyToken = async token => {
  try {
    // Create a temporary Supabase client with the user's token
    const supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get user from the temporary client
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser();

    if (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }

    if (!user) {
      throw new Error('User not found or token invalid');
    }

    return user;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

module.exports = {
  verifyToken,
  extractToken,
};
