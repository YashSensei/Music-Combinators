// User roles
const USER_ROLES = {
  LISTENER: 'listener',
  CREATOR: 'creator',
  ADMIN: 'admin',
};

// User statuses
const USER_STATUSES = {
  WAITLISTED: 'waitlisted',
  ACTIVE: 'active',
  BANNED: 'banned',
};

// Creator application statuses
const APPLICATION_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Content types for likes
const CONTENT_TYPES = {
  TRACK: 'track',
  REEL: 'reel',
};

// File upload limits
const FILE_LIMITS = {
  AUDIO: {
    MAX_SIZE: 15 * 1024 * 1024, // 15MB
    ALLOWED_TYPES: ['audio/mpeg', 'audio/mp3'],
    ALLOWED_EXTENSIONS: ['.mp3'],
  },
  VIDEO: {
    MAX_SIZE: 50 * 1024 * 1024, // 50MB
    MAX_DURATION: 60, // 60 seconds
    ALLOWED_TYPES: ['video/mp4'],
    ALLOWED_EXTENSIONS: ['.mp4'],
  },
  IMAGE: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  },
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// Settings keys
const SETTINGS_KEYS = {
  ONBOARDING_BATCH_SIZE: 'onboarding_batch_size',
  MAX_ACTIVE_USERS: 'max_active_users',
};

// Default settings values
const DEFAULT_SETTINGS = {
  [SETTINGS_KEYS.ONBOARDING_BATCH_SIZE]: '10',
  [SETTINGS_KEYS.MAX_ACTIVE_USERS]: '100',
};

module.exports = {
  USER_ROLES,
  USER_STATUSES,
  APPLICATION_STATUSES,
  CONTENT_TYPES,
  FILE_LIMITS,
  PAGINATION,
  SETTINGS_KEYS,
  DEFAULT_SETTINGS,
};
