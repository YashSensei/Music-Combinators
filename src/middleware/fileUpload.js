const multer = require('multer');
const { ValidationError } = require('../utils/errors');

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  audio: 50 * 1024 * 1024, // 50MB
  video: 100 * 1024 * 1024, // 100MB
  image: 5 * 1024 * 1024, // 5MB
};

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

/**
 * Configure multer storage (memory storage for direct upload to Supabase)
 */
const storage = multer.memoryStorage();

/**
 * File filter function
 */
const fileFilter = category => (req, file, cb) => {
  const allowedTypes = ALLOWED_MIME_TYPES[category];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      new ValidationError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`),
      false
    );
  }

  cb(null, true);
};

/**
 * Create multer upload middleware for specific file type
 */
const createUploadMiddleware = (category, fieldName, maxCount = 1) => {
  return multer({
    storage,
    fileFilter: fileFilter(category),
    limits: {
      fileSize: FILE_SIZE_LIMITS[category],
    },
  }).fields([{ name: fieldName, maxCount }]);
};

/**
 * Middleware for track uploads (audio + optional cover)
 */
const uploadTrack = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.audio,
  },
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

/**
 * Middleware for reel uploads (video only)
 */
const uploadReel = multer({
  storage,
  fileFilter: fileFilter('video'),
  limits: {
    fileSize: FILE_SIZE_LIMITS.video,
  },
}).single('video');

/**
 * Middleware for image uploads (avatar, covers, etc.)
 */
const uploadImage = multer({
  storage,
  fileFilter: fileFilter('image'),
  limits: {
    fileSize: FILE_SIZE_LIMITS.image,
  },
}).single('image');

/**
 * Error handling middleware for multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ValidationError('File size exceeds maximum limit'));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new ValidationError('Too many files uploaded'));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new ValidationError('Unexpected field in file upload'));
    }
    return next(new ValidationError(err.message));
  }
  next(err);
};

module.exports = {
  uploadTrack,
  uploadReel,
  uploadImage,
  handleUploadError,
  createUploadMiddleware,
};
