const { supabaseAdmin } = require('../config/database');
const { AppError, ValidationError } = require('../utils/errors');

/**
 * Submit a creator application
 */
const submitCreatorApplication = async (userId, applicationData) => {
  const { artist_name, portfolio_url, application_reason, sample_tracks } = applicationData;

  // Check if user already has an active or pending application
  const { data: existingApplication, error: checkError } = await supabaseAdmin
    .from('creator_applications')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'approved'])
    .maybeSingle();

  if (checkError) {
    // eslint-disable-next-line no-console
    console.error('Error checking existing applications:', checkError);
    throw new AppError('Failed to check existing applications', 500);
  }

  if (existingApplication) {
    if (existingApplication.status === 'pending') {
      throw new ValidationError('You already have a pending application');
    }
    if (existingApplication.status === 'approved') {
      throw new ValidationError('You are already a creator');
    }
  }

  // Create new application
  const { data: application, error: insertError } = await supabaseAdmin
    .from('creator_applications')
    .insert({
      user_id: userId,
      artist_name,
      portfolio_url,
      application_reason,
      sample_tracks,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    // eslint-disable-next-line no-console
    console.error('Error creating application:', insertError);
    throw new AppError('Failed to submit application', 500);
  }

  return application;
};

/**
 * Get user's application status
 */
const getUserApplication = async userId => {
  const { data: application, error } = await supabaseAdmin
    .from('creator_applications')
    .select(
      'id, artist_name, portfolio_url, application_reason, sample_tracks, status, submitted_at, reviewed_at, admin_notes'
    )
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to fetch application', 500);
  }

  return application;
};

/**
 * Get all pending applications (admin only)
 */
const getPendingApplications = async (pagination = {}) => {
  const { limit = 20, offset = 0 } = pagination;

  const {
    data: applications,
    error,
    count,
  } = await supabaseAdmin
    .from('creator_applications')
    .select(
      `
      id,
      artist_name,
      portfolio_url,
      application_reason,
      sample_tracks,
      status,
      submitted_at,
      reviewed_at,
      admin_notes,
      user:users!creator_applications_user_id_fkey (
        id,
        profiles!inner (username, display_name, avatar_url)
      )
    `,
      { count: 'exact' }
    )
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new AppError('Failed to fetch pending applications', 500);
  }

  return { applications, total: count };
};

/**
 * Approve or reject a creator application (admin only)
 */
const reviewApplication = async (applicationId, adminId, decision, adminNotes = '') => {
  if (!['approved', 'rejected'].includes(decision)) {
    throw new ValidationError('Decision must be either approved or rejected');
  }

  // Get the application with user details
  const { data: application, error: fetchError } = await supabaseAdmin
    .from('creator_applications')
    .select(
      `
      id,
      user_id,
      status,
      user:users!creator_applications_user_id_fkey (
        id,
        role,
        profiles!inner (username, display_name)
      )
    `
    )
    .eq('id', applicationId)
    .single();

  if (fetchError) {
    // eslint-disable-next-line no-console
    console.error('Error fetching application:', fetchError);
    throw new AppError('Application not found', 404);
  }

  if (application.status !== 'pending') {
    throw new ValidationError('Application has already been reviewed');
  }

  // Use admin client for privileged operations
  const { error: updateAppError } = await supabaseAdmin
    .from('creator_applications')
    .update({
      status: decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      admin_notes: adminNotes,
    })
    .eq('id', applicationId);

  if (updateAppError) {
    throw new AppError('Failed to update application status', 500);
  }

  // If approved, upgrade user role to creator
  if (decision === 'approved') {
    const { error: roleUpdateError } = await supabaseAdmin
      .from('users')
      .update({ role: 'creator' })
      .eq('id', application.user_id);

    if (roleUpdateError) {
      throw new AppError('Failed to upgrade user role', 500);
    }
  }

  return {
    applicationId,
    decision,
    username: application.user.profiles.username,
    displayName: application.user.profiles.display_name,
  };
};

/**
 * Get all applications with filtering (admin only)
 */
const getAllApplications = async (filters = {}, pagination = {}) => {
  const { status, userId } = filters;
  const { limit = 20, offset = 0 } = pagination;

  let query = supabaseAdmin.from('creator_applications').select(
    `
      id,
      artist_name,
      portfolio_url,
      application_reason,
      sample_tracks,
      status,
      submitted_at,
      reviewed_at,
      admin_notes,
      user:users!creator_applications_user_id_fkey (
        id,
        profiles!inner (username, display_name, avatar_url)
      ),
      reviewer:users!creator_applications_reviewed_by_fkey (
        profiles!inner (username, display_name)
      )
    `,
    { count: 'exact' }
  );

  if (status) {
    query = query.eq('status', status);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const {
    data: applications,
    error,
    count,
  } = await query.order('submitted_at', { ascending: false }).range(offset, offset + limit - 1);

  if (error) {
    throw new AppError('Failed to fetch applications', 500);
  }

  return { applications, total: count };
};

module.exports = {
  submitCreatorApplication,
  getUserApplication,
  getPendingApplications,
  reviewApplication,
  getAllApplications,
};
