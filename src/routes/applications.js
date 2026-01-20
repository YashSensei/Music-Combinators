const express = require('express');
const router = express.Router();

const applicationController = require('../controllers/applicationController');
const { authenticate } = require('../middleware/auth');
const { requireActive, requireRole } = require('../middleware/authorization');

/**
 * @route   POST /api/applications
 * @desc    Submit a creator application
 * @access  Private (active listeners only)
 */
router.post('/', authenticate, requireActive(), applicationController.submitApplication);

/**
 * @route   GET /api/applications/me
 * @desc    Get current user's application status
 * @access  Private (authenticated users)
 */
router.get('/me', authenticate, applicationController.getMyApplication);

/**
 * @route   GET /api/applications/pending
 * @desc    Get all pending applications for review
 * @access  Private (admin only)
 */
router.get(
  '/pending',
  authenticate,
  requireActive(),
  requireRole(['admin']),
  applicationController.getPendingApplications
);

/**
 * @route   PUT /api/applications/:id/review
 * @desc    Review a creator application (approve/reject)
 * @access  Private (admin only)
 */
router.put(
  '/:id/review',
  authenticate,
  requireActive(),
  requireRole(['admin']),
  applicationController.reviewApplication
);

/**
 * @route   GET /api/applications
 * @desc    Get all applications with filtering options
 * @access  Private (admin only)
 */
router.get(
  '/',
  authenticate,
  requireActive(),
  requireRole(['admin']),
  applicationController.getAllApplications
);

module.exports = router;
