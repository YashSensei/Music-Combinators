const { supabase } = require('./database');

// Storage bucket configuration
const STORAGE_CONFIG = {
  BUCKETS: {
    UPLOADS: process.env.UPLOAD_BUCKET_NAME || 'music-combinators-uploads',
  },
  PATHS: {
    AUDIO: 'audio',
    VIDEO: 'video',
    IMAGES: 'images',
  },
};

/**
 * Get Supabase storage client
 * @returns {Object} Supabase storage client
 */
const getStorageClient = () => {
  return supabase.storage;
};

/**
 * Generate public URL for a stored file
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in storage
 * @returns {Object} URL data or error
 */
const getPublicUrl = (bucket, path) => {
  const storage = getStorageClient();
  const { data } = storage.from(bucket).getPublicUrl(path);
  return data;
};

/**
 * Upload file to Supabase storage
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in storage
 * @param {Buffer} file - File buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadFile = async (bucket, path, file, options = {}) => {
  const storage = getStorageClient();

  const { data, error } = await storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    ...options,
  });

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Delete file from Supabase storage
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in storage
 * @returns {Promise<Object>} Delete result
 */
const deleteFile = async (bucket, path) => {
  const storage = getStorageClient();

  const { data, error } = await storage.from(bucket).remove([path]);

  if (error) {
    throw error;
  }

  return data;
};

/**
 * List files in storage bucket
 * @param {string} bucket - Storage bucket name
 * @param {string} path - Folder path (optional)
 * @returns {Promise<Array>} List of files
 */
const listFiles = async (bucket, path = '') => {
  const storage = getStorageClient();

  const { data, error } = await storage.from(bucket).list(path);

  if (error) {
    throw error;
  }

  return data;
};

module.exports = {
  STORAGE_CONFIG,
  getStorageClient,
  getPublicUrl,
  uploadFile,
  deleteFile,
  listFiles,
};
