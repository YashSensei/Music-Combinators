const express = require('express');
const router = express.Router();
const trackController = require('../controllers/trackController');
const { authenticate } = require('../middleware/auth');
const { requireActive, requireRole } = require('../middleware/authorization');
const { uploadTrack, handleUploadError } = require('../middleware/fileUpload');

// Public routes
router.get('/', trackController.getAllTracks);
router.get('/search', trackController.searchTracks);
router.get('/:id', trackController.getTrack);
router.get('/user/:userId', trackController.getUserTracks);

// Increment play count (public - no auth required)
router.post('/:id/play', trackController.playTrack);

// Creator-only routes
router.post(
  '/',
  authenticate,
  requireActive(),
  requireRole(['creator', 'admin']),
  uploadTrack,
  handleUploadError,
  trackController.createTrack
);

router.put(
  '/:id',
  authenticate,
  requireActive(),
  requireRole(['creator', 'admin']),
  trackController.updateTrack
);

router.delete(
  '/:id',
  authenticate,
  requireActive(),
  requireRole(['creator', 'admin']),
  trackController.deleteTrack
);

// Like/unlike (authenticated users only)
router.post('/:id/like', authenticate, requireActive(), trackController.toggleLike);

module.exports = router;
