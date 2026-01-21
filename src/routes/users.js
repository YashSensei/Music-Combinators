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

// Get user public profile by ID
router.get('/:id', userController.getPublicProfile);

// Follow/unfollow user
router.post('/:id/follow', authenticate, requireActive(), userController.followUser);
router.delete('/:id/follow', authenticate, requireActive(), userController.unfollowUser);

// Get followers/following
router.get('/:id/followers', userController.getFollowers);
router.get('/:id/following', userController.getFollowing);

module.exports = router;
