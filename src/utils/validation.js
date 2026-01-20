const { ValidationError } = require('./errors');

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
const isValidEmail = email => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid
 */
const isValidUsername = username => {
  if (!username || typeof username !== 'string') return false;
  if (username.length < 3 || username.length > 50) return false;
  return /^[a-zA-Z0-9_]+$/.test(username);
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
const isValidUrl = url => {
  try {
    // eslint-disable-next-line no-undef
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitize string input
 * @param {string} input - String to sanitize
 * @param {number} maxLength - Maximum length
 * @returns {string} Sanitized string
 */
const sanitizeString = (input, maxLength = 1000) => {
  if (!input || typeof input !== 'string') return '';
  return input.trim().substring(0, maxLength);
};

/**
 * Validate pagination parameters
 * @param {Object} query - Query object with page/limit
 * @returns {Object} Validated pagination params
 */
const validatePagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Validate required fields
 * @param {Object} data - Data object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @throws {ValidationError} If required fields are missing
 */
const validateRequired = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
};

/**
 * Validate file type
 * @param {string} mimeType - MIME type of the file
 * @param {Array<string>} allowedTypes - Array of allowed MIME types
 * @returns {boolean} True if valid
 */
const isValidFileType = (mimeType, allowedTypes) => {
  return allowedTypes.includes(mimeType);
};

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} True if valid
 */
const isValidFileSize = (size, maxSize) => {
  return size <= maxSize;
};

module.exports = {
  isValidEmail,
  isValidUsername,
  isValidUrl,
  sanitizeString,
  validatePagination,
  validateRequired,
  isValidFileType,
  isValidFileSize,
};
