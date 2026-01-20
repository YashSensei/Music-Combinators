const applicationService = require('../services/applicationService');
const { ValidationError } = require('../utils/errors');
const { validateRequired, isValidUrl } = require('../utils/validation');
const { PAGINATION } = require('../utils/constants');

/**
 * Submit a creator application
 */
const submitApplication = async (req, res, next) => {
  try {
    const { artist_name, portfolio_url, application_reason, sample_tracks } = req.body;

    // Validate required fields
    validateRequired({ artist_name, application_reason }, ['artist_name', 'application_reason']);

    // Validate field lengths
    if (artist_name.length < 2 || artist_name.length > 100) {
      throw new ValidationError('Artist name must be between 2 and 100 characters');
    }

    if (application_reason.length < 50 || application_reason.length > 2000) {
      throw new ValidationError('Application reason must be between 50 and 2000 characters');
    }

    // Validate portfolio URL if provided
    if (portfolio_url && !isValidUrl(portfolio_url)) {
      throw new ValidationError('Invalid portfolio URL format');
    }

    // Validate sample tracks array if provided
    if (sample_tracks) {
      if (!Array.isArray(sample_tracks)) {
        throw new ValidationError('Sample tracks must be an array');
      }

      if (sample_tracks.length > 5) {
        throw new ValidationError('Maximum 5 sample tracks allowed');
      }

      for (const track of sample_tracks) {
        if (!isValidUrl(track)) {
          throw new ValidationError('Invalid sample track URL format');
        }
      }
    }

    const application = await applicationService.submitCreatorApplication(req.user.id, {
      artist_name: artist_name.trim(),
      portfolio_url: portfolio_url?.trim() || null,
      application_reason: application_reason.trim(),
      sample_tracks: sample_tracks || [],
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's application status
 */
const getMyApplication = async (req, res, next) => {
  try {
    const application = await applicationService.getUserApplication(req.user.id);

    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending applications (admin only)
 */
const getPendingApplications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT
    );
    const offset = (page - 1) * limit;

    const { applications, total } = await applicationService.getPendingApplications({
      limit,
      offset,
    });

    res.json({
      success: true,
      data: applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Review a creator application (admin only)
 */
const reviewApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, admin_notes } = req.body;

    validateRequired({ decision }, ['decision']);

    if (!['approved', 'rejected'].includes(decision)) {
      throw new ValidationError('Decision must be either approved or rejected');
    }

    if (admin_notes && admin_notes.length > 1000) {
      throw new ValidationError('Admin notes cannot exceed 1000 characters');
    }

    const result = await applicationService.reviewApplication(
      id,
      req.user.id,
      decision,
      admin_notes?.trim() || ''
    );

    res.json({
      success: true,
      message: `Application ${decision} successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all applications with filtering (admin only)
 */
const getAllApplications = async (req, res, next) => {
  try {
    const { status, user_id } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT
    );
    const offset = (page - 1) * limit;

    // Validate status filter
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      throw new ValidationError('Invalid status filter. Must be: pending, approved, or rejected');
    }

    const filters = {};
    if (status) filters.status = status;
    if (user_id) filters.userId = user_id;

    const { applications, total } = await applicationService.getAllApplications(filters, {
      limit,
      offset,
    });

    res.json({
      success: true,
      data: applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitApplication,
  getMyApplication,
  getPendingApplications,
  reviewApplication,
  getAllApplications,
};
