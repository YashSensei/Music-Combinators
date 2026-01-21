const { supabaseAdmin } = require('../config/database');
const { AppError, ValidationError } = require('../utils/errors');
const path = require('path');

const BUCKET_NAME = process.env.UPLOAD_BUCKET_NAME || 'music-combinators-uploads';

// Allowed file types
const ALLOWED_TYPES = {
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

// Max file sizes (in bytes)
const MAX_SIZES = {
  audio: 50 * 1024 * 1024, // 50MB
  video: 100 * 1024 * 1024, // 100MB
  image: 5 * 1024 * 1024, // 5MB
};

/**
 * Validate file type and size
 * @param {Object} file - File object with buffer, mimetype, size
 * @param {string} category - File category (audio/video/image)
 */
const validateFile = (file, category) => {
  if (!file || !file.buffer) {
    throw new ValidationError('No file provided');
  }

  if (!ALLOWED_TYPES[category].includes(file.mimetype)) {
    throw new ValidationError(
      `Invalid file type. Allowed types: ${ALLOWED_TYPES[category].join(', ')}`
    );
  }

  if (file.size > MAX_SIZES[category]) {
    const maxSizeMB = MAX_SIZES[category] / (1024 * 1024);
    throw new ValidationError(`File size exceeds ${maxSizeMB}MB limit`);
  }
};

/**
 * Generate unique filename
 * @param {string} userId - User ID
 * @param {string} originalName - Original filename
 * @param {string} category - File category
 * @returns {string} Unique filename
 */
const generateFilename = (userId, originalName, category) => {
  const timestamp = Date.now();
  const ext = path.extname(originalName);
  const sanitized = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');
  return `${category}/${userId}/${timestamp}_${sanitized}${ext}`;
};

/**
 * Upload file to Supabase Storage
 * @param {Object} file - File object with buffer, mimetype, size, originalname
 * @param {string} userId - User ID
 * @param {string} category - File category (audio/video/image)
 * @returns {Promise<string>} Public URL of uploaded file
 */
const uploadFile = async (file, userId, category) => {
  validateFile(file, category);

  const filename = generateFilename(userId, file.originalname, category);

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('File upload error:', error);
    throw new AppError('Failed to upload file', 500);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return publicUrl;
};

/**
 * Delete file from Supabase Storage
 * @param {string} fileUrl - Public URL of file to delete
 * @returns {Promise<void>}
 */
const deleteFile = async fileUrl => {
  if (!fileUrl || !fileUrl.includes(BUCKET_NAME)) {
    return; // Not a valid storage URL
  }

  // Extract file path from URL
  const urlParts = fileUrl.split(`${BUCKET_NAME}/`);
  if (urlParts.length < 2) {
    return;
  }

  const filePath = urlParts[1];

  const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).remove([filePath]);

  if (error) {
    // eslint-disable-next-line no-console
    console.error('File deletion error:', error);
    // Don't throw error, just log it
  }
};

/**
 * Upload audio file (for tracks)
 * @param {Object} file - File object
 * @param {string} userId - User ID
 * @returns {Promise<string>} Public URL
 */
const uploadAudio = async (file, userId) => {
  return uploadFile(file, userId, 'audio');
};

/**
 * Upload video file (for reels)
 * @param {Object} file - File object
 * @param {string} userId - User ID
 * @returns {Promise<string>} Public URL
 */
const uploadVideo = async (file, userId) => {
  return uploadFile(file, userId, 'video');
};

/**
 * Upload image file (for covers/avatars)
 * @param {Object} file - File object
 * @param {string} userId - User ID
 * @returns {Promise<string>} Public URL
 */
const uploadImage = async (file, userId) => {
  return uploadFile(file, userId, 'image');
};

module.exports = {
  uploadFile,
  uploadAudio,
  uploadVideo,
  uploadImage,
  deleteFile,
  ALLOWED_TYPES,
  MAX_SIZES,
};
