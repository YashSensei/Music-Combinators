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

module.exports = router;
