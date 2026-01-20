const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireActive } = require('../middleware/authorization');
const userController = require('../controllers/userController');

const router = express.Router();

// Get current user profile
router.get('/me', authenticate, userController.getCurrentUser);

// Update current user profile
router.put('/me/profile', authenticate, requireActive(), userController.updateProfile);

// Search users (public endpoint with optional auth)
router.get('/search', userController.searchUsers);

// Get user by username (public endpoint)
router.get('/:username', userController.getUserByUsername);

// Creator application routes - will implement in next phase
router.post('/creator-application', (req, res) => {
  res.json({ message: 'Creator application - coming soon' });
});

module.exports = router;
