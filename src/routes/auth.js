const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user
 * @access  Public
 */
router.post('/signup', authController.signup);

/**
 * @route   POST /api/auth/signin
 * @desc    Sign in user
 * @access  Public
 */
router.post('/signin', authController.signin);

/**
 * @route   POST /api/auth/callback
 * @desc    OAuth callback handler
 * @access  Public
 */
router.post('/callback', (req, res) => {
  res.json({ message: 'Auth callback - coming soon' });
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', (req, res) => {
  res.json({ message: 'Token refresh - coming soon' });
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route   POST /api/auth/resend-confirmation
 * @desc    Resend email confirmation
 * @access  Public
 */
router.post('/resend-confirmation', authController.resendConfirmation);

module.exports = router;
