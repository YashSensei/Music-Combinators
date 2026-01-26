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
      // Check if the error is due to unconfirmed email
      if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
        throw new AuthenticationError(
          'Email not verified. Please check your inbox and verify your email address before signing in.'
        );
      }
      throw new AuthenticationError('Invalid email or password');
    }

    // Additional check: Ensure email is confirmed
    if (data.user && !data.user.email_confirmed_at) {
      throw new AuthenticationError(
        'Email not verified. Please check your inbox and verify your email address before signing in.'
      );
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

/**
 * Request password reset
 * Sends a password reset email with a token
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email is required');
    }

    // Validate email format
    if (!isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Use Supabase's built-in password reset
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`,
    });

    if (error) {
      /* eslint-disable no-console */
      console.error('❌ Password reset error:', error.message);
      console.error('Error code:', error.code);
      console.error('Error status:', error.status);
      /* eslint-enable no-console */

      // Log but don't expose the error to prevent email enumeration
    } else {
      // eslint-disable-next-line no-console
      console.log('✅ Password reset email requested for:', email);
    }

    // Always return success message (security best practice)
    // Note: Email may take 1-2 minutes to arrive on free tier
    res.status(200).json({
      message:
        'If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder. Email may take 1-2 minutes to arrive.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 * Updates the user's password using the reset token
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new ValidationError('Token and new password are required');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    // Verify the reset token and update password
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend email confirmation
 * Resends the email verification link
 */
const resendConfirmation = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email is required');
    }

    // Resend confirmation email using Supabase
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      throw new ValidationError(error.message);
    }

    res.status(200).json({
      message: 'Confirmation email sent. Please check your inbox.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  signin,
  forgotPassword,
  resetPassword,
  resendConfirmation,
};
