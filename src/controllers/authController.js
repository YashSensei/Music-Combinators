const { createClient } = require('@supabase/supabase-js');
const { ValidationError, AuthenticationError } = require('../utils/errors');
const { validateRequired, isValidEmail } = require('../utils/validation');

// Create a supabase client for auth operations (uses anon key)
const getSupabaseClient = () => {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
};

/**
 * Sign up new user
 */
const signup = async (req, res, next) => {
  try {
    const { email, password, username, display_name } = req.body;

    // Validate required fields
    validateRequired({ email, password, username, display_name }, [
      'email',
      'password',
      'username',
      'display_name',
    ]);

    // Validate email format
    if (!isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Validate username
    if (username.length < 3 || username.length > 30) {
      throw new ValidationError('Username must be between 3 and 30 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new ValidationError('Username can only contain letters, numbers, and underscores');
    }

    // Sign up with Supabase
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name,
        },
      },
    });

    if (error) {
      throw new AuthenticationError(error.message);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          username: data.user.user_metadata.username,
          display_name: data.user.user_metadata.display_name,
        },
        session: data.session,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sign in user
 */
const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    validateRequired({ email, password }, ['email', 'password']);

    // Validate email format
    if (!isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Sign in with Supabase
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new AuthenticationError('Invalid email or password');
    }

    res.status(200).json({
      success: true,
      message: 'Signed in successfully',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          username: data.user.user_metadata.username,
          display_name: data.user.user_metadata.display_name,
        },
        session: data.session,
        accessToken: data.session.access_token,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  signin,
};
