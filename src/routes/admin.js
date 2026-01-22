const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireRole(['admin']));

// Platform statistics
router.get('/stats', adminController.getPlatformStats);

// Waitlist management
router.get('/waitlist', adminController.getWaitlistedUsers);
router.post('/users/approve', adminController.approveUser);
router.post('/users/batch-approve', adminController.batchApproveUsers);

// User moderation
router.post('/users/:id/ban', adminController.banUser);
router.post('/users/:id/unban', adminController.unbanUser);

// Creator applications
router.get('/creator-applications', adminController.getCreatorApplications);
router.post('/creator-applications/:id/approve', adminController.approveCreatorApplication);
router.post('/creator-applications/:id/reject', adminController.rejectCreatorApplication);

// Content moderation
router.delete('/tracks/:id', adminController.deleteTrack);
router.delete('/reels/:id', adminController.deleteReel);

module.exports = router;
