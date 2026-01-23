const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorization');

/**
 * @route   POST /api/email/test
 * @desc    Test email service (admin only)
 * @access  Admin
 */
router.post('/test', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { to, type = 'welcome' } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email (to) is required' });
    }

    if (!emailService.isConfigured()) {
      return res.status(503).json({
        error: 'Email service not configured',
        hint: 'Set RESEND_API_KEY in .env file',
      });
    }

    let result;

    switch (type) {
      case 'welcome':
        result = await emailService.sendWaitlistApprovalEmail(to, 'Test User');
        break;

      case 'creator-approval':
        result = await emailService.sendCreatorApprovalEmail(to, 'Test Creator');
        break;

      case 'creator-rejection':
        result = await emailService.sendCreatorRejectionEmail(
          to,
          'Test User',
          'This is a test rejection email'
        );
        break;

      case 'password-reset':
        result = await emailService.sendPasswordResetEmail(to, 'test_token_12345');
        break;

      default:
        return res.status(400).json({
          error: 'Invalid email type',
          validTypes: ['welcome', 'creator-approval', 'creator-rejection', 'password-reset'],
        });
    }

    res.status(200).json({
      success: true,
      message: `Test ${type} email sent to ${to}`,
      provider: emailService.getProvider(),
      result,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Test email error:', error);
    res.status(500).json({
      error: 'Failed to send test email',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/email/status
 * @desc    Check email service status
 * @access  Public
 */
router.get('/status', (req, res) => {
  const isConfigured = emailService.isConfigured();
  const provider = emailService.getProvider();

  res.status(200).json({
    configured: isConfigured,
    provider: provider || 'none',
    status: isConfigured ? 'operational' : 'not configured',
    availableTemplates: [
      'waitlist-approval',
      'creator-approval',
      'creator-rejection',
      'password-reset',
    ],
  });
});

module.exports = router;
