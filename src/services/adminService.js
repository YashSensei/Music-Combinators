const { supabaseAdmin } = require('../config/database');
const emailService = require('./emailService');

/**
 * Get waitlisted users (paginated)
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Waitlisted users and pagination info
 */
const getWaitlistedUsers = async (options = {}) => {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  // Get total count
  const { count } = await supabaseAdmin
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'waitlisted');

  // Get waitlisted users ordered by creation date (FIFO)
  const { data, error } = await supabaseAdmin
    .from('users')
    .select(
      `
      id,
      role,
      status,
      created_at,
      profiles!inner(
        username,
        display_name,
        bio,
        avatar_url
      )
    `
    )
    .eq('status', 'waitlisted')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Flatten the response
  const users = data.map(user => ({
    id: user.id,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    username: user.profiles.username,
    display_name: user.profiles.display_name,
    bio: user.profiles.bio,
    avatar_url: user.profiles.avatar_url,
  }));

  return {
    users,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
};

/**
 * Approve a single user from waitlist by email
 * @param {string} email - User email to approve
 * @returns {Promise<Object>} Updated user
 */
const approveUser = async email => {
  // Query auth.users table via RPC or direct query to find user by email
  const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) throw listError;

  const authUser = authUsers.users.find(u => u.email === email);

  if (!authUser) {
    throw new Error('User not found with this email');
  }

  const userId = authUser.id;

  // Now approve the user
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .eq('status', 'waitlisted')
    .select(
      `
      id,
      role,
      status,
      approved_at,
      profiles!inner(username, display_name)
    `
    )
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('User not in waitlist or already approved');
    }
    throw error;
  }

  // Send approval email notification
  try {
    if (emailService.isConfigured()) {
      await emailService.sendWaitlistApprovalEmail(email, data.profiles.username);
    }
  } catch (emailError) {
    // eslint-disable-next-line no-console
    console.error('Failed to send approval email:', emailError);
    // Don't fail the approval if email fails
  }

  return {
    id: data.id,
    email: email,
    role: data.role,
    status: data.status,
    approved_at: data.approved_at,
    username: data.profiles.username,
    display_name: data.profiles.display_name,
  };
};

/**
 * Batch approve users from waitlist (FIFO)
 * @param {number} count - Number of users to approve
 * @returns {Promise<Object>} Approved users
 */
const batchApproveUsers = async count => {
  if (count < 1) {
    throw new Error('Count must be at least 1');
  }

  if (count > 100) {
    throw new Error('Cannot approve more than 100 users at once');
  }

  // Get the oldest waitlisted users
  const { data: waitlistedUsers, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('status', 'waitlisted')
    .order('created_at', { ascending: true })
    .limit(count);

  if (fetchError) throw fetchError;

  if (waitlistedUsers.length === 0) {
    return {
      approved: [],
      count: 0,
      message: 'No users in waitlist',
    };
  }

  const userIds = waitlistedUsers.map(u => u.id);

  // Batch update
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
    })
    .in('id', userIds).select(`
      id,
      role,
      status,
      approved_at,
      profiles!inner(username, display_name)
    `);

  if (error) throw error;

  const approved = data.map(user => ({
    id: user.id,
    role: user.role,
    status: user.status,
    approved_at: user.approved_at,
    username: user.profiles.username,
    display_name: user.profiles.display_name,
  }));

  return {
    approved,
    count: approved.length,
    message: `Successfully approved ${approved.length} user(s)`,
  };
};

/**
 * Get pending creator applications
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Pending applications and pagination info
 */
const getCreatorApplications = async (options = {}) => {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  // Get total count
  const { count } = await supabaseAdmin
    .from('creator_applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Get pending applications
  const { data, error } = await supabaseAdmin
    .from('creator_applications')
    .select(
      `
      id,
      user_id,
      artist_name,
      genre,
      bio,
      sample_work_url,
      status,
      created_at,
      users!inner(
        profiles!inner(
          username,
          display_name,
          avatar_url
        )
      )
    `
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const applications = data.map(app => ({
    id: app.id,
    user_id: app.user_id,
    artist_name: app.artist_name,
    genre: app.genre,
    bio: app.bio,
    sample_work_url: app.sample_work_url,
    status: app.status,
    created_at: app.created_at,
    user: {
      username: app.users.profiles.username,
      display_name: app.users.profiles.display_name,
      avatar_url: app.users.profiles.avatar_url,
    },
  }));

  return {
    applications,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
};

/**
 * Approve creator application
 * @param {string} applicationId - Application ID
 * @returns {Promise<Object>} Updated application
 */
const approveCreatorApplication = async applicationId => {
  // Get application
  const { data: application, error: fetchError } = await supabaseAdmin
    .from('creator_applications')
    .select('user_id, status')
    .eq('id', applicationId)
    .single();

  if (fetchError) throw fetchError;

  if (application.status !== 'pending') {
    throw new Error('Application already processed');
  }

  // Update application status
  const { error: updateAppError } = await supabaseAdmin
    .from('creator_applications')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (updateAppError) throw updateAppError;

  // Upgrade user to creator
  const { data: updatedUser, error: updateUserError } = await supabaseAdmin
    .from('users')
    .update({ role: 'creator' })
    .eq('id', application.user_id)
    .select(
      `
      id,
      role,
      profiles!inner(username, display_name)
    `
    )
    .single();

  if (updateUserError) throw updateUserError;

  // Get user email for notification
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(application.user_id);

  // Send approval email notification
  try {
    if (emailService.isConfigured() && authUser?.user?.email) {
      await emailService.sendCreatorApprovalEmail(
        authUser.user.email,
        updatedUser.profiles.username
      );
    }
  } catch (emailError) {
    // eslint-disable-next-line no-console
    console.error('Failed to send creator approval email:', emailError);
    // Don't fail the approval if email fails
  }

  return {
    application_id: applicationId,
    user: {
      id: updatedUser.id,
      role: updatedUser.role,
      username: updatedUser.profiles.username,
      display_name: updatedUser.profiles.display_name,
    },
    message: 'Creator application approved successfully',
  };
};

/**
 * Reject creator application
 * @param {string} applicationId - Application ID
 * @param {string} reason - Rejection reason (optional)
 * @returns {Promise<Object>} Updated application
 */
const rejectCreatorApplication = async (applicationId, reason = null) => {
  // First get application details for email
  const { data: application, error: fetchError } = await supabaseAdmin
    .from('creator_applications')
    .select(
      `
      id,
      user_id,
      status,
      users!inner(
        profiles!inner(username)
      )
    `
    )
    .eq('id', applicationId)
    .single();

  if (fetchError) throw fetchError;

  if (application.status !== 'pending') {
    throw new Error('Application not found or already processed');
  }

  // Update application
  const { data, error } = await supabaseAdmin
    .from('creator_applications')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', applicationId)
    .eq('status', 'pending')
    .select('id, user_id, status')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Application not found or already processed');
    }
    throw error;
  }

  // Get user email for notification
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(data.user_id);

  // Send rejection email notification
  try {
    if (emailService.isConfigured() && authUser?.user?.email) {
      await emailService.sendCreatorRejectionEmail(
        authUser.user.email,
        application.users.profiles.username,
        reason
      );
    }
  } catch (emailError) {
    // eslint-disable-next-line no-console
    console.error('Failed to send creator rejection email:', emailError);
    // Don't fail the rejection if email fails
  }

  return {
    application_id: data.id,
    user_id: data.user_id,
    status: data.status,
    message: 'Creator application rejected',
  };
};

/**
 * Get platform statistics
 * @returns {Promise<Object>} Platform stats
 */
const getPlatformStats = async () => {
  // Get user counts by status
  const { data: userStats } = await supabaseAdmin
    .from('users')
    .select('status, role')
    .then(({ data }) => {
      const stats = {
        total: data.length,
        waitlisted: data.filter(u => u.status === 'waitlisted').length,
        active: data.filter(u => u.status === 'active').length,
        banned: data.filter(u => u.status === 'banned').length,
        listeners: data.filter(u => u.role === 'listener').length,
        creators: data.filter(u => u.role === 'creator').length,
        admins: data.filter(u => u.role === 'admin').length,
      };
      return { data: stats };
    });

  // Get content counts
  const { count: trackCount } = await supabaseAdmin
    .from('tracks')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: reelCount } = await supabaseAdmin
    .from('reels')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: pendingApplications } = await supabaseAdmin
    .from('creator_applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  return {
    users: userStats,
    content: {
      tracks: trackCount,
      reels: reelCount,
    },
    pending: {
      creator_applications: pendingApplications,
    },
  };
};

module.exports = {
  getWaitlistedUsers,
  approveUser,
  batchApproveUsers,
  getCreatorApplications,
  approveCreatorApplication,
  rejectCreatorApplication,
  getPlatformStats,
};
