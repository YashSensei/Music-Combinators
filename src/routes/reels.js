const express = require('express');
const router = express.Router();
const reelController = require('../controllers/reelController');
const { authenticate } = require('../middleware/auth');
const { requireActive, requireRole } = require('../middleware/authorization');
const { uploadReel, handleUploadError } = require('../middleware/fileUpload');

// Public routes
router.get('/feed', reelController.getReelFeed);
router.get('/:id', reelController.getReel);
router.get('/user/:userId', reelController.getUserReels);

// Increment view count (public - no auth required)
router.post('/:id/view', reelController.viewReel);

// Creator-only routes
router.post(
  '/',
  authenticate,
  requireActive(),
  requireRole(['creator', 'admin']),
  uploadReel,
  handleUploadError,
  reelController.createReel
);

router.put(
  '/:id',
  authenticate,
  requireActive(),
  requireRole(['creator', 'admin']),
  reelController.updateReel
);

router.delete(
  '/:id',
  authenticate,
  requireActive(),
  requireRole(['creator', 'admin']),
  reelController.deleteReel
);

// Like/unlike (authenticated users only)
router.post('/:id/like', authenticate, requireActive(), reelController.toggleLike);

module.exports = router;
