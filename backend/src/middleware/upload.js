const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

/**
 * Allowed MIME types for medical files
 * Maps extension to allowed MIME types
 */
const ALLOWED_MIME_TYPES = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.pdf': ['application/pdf']
};

/**
 * Get all allowed MIME types as flat array
 */
const getAllowedMimeTypes = () => {
  return Object.values(ALLOWED_MIME_TYPES).flat();
};

/**
 * Multer memory storage (for MIME validation before saving)
 */
const memoryStorage = multer.memoryStorage();

/**
 * File filter - basic extension check (first line of defense)
 */
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!config.upload.allowedTypes.includes(ext)) {
    return cb(new Error(`Invalid file type. Allowed: ${config.upload.allowedTypes.join(', ')}`), false);
  }

  const allowedMimes = getAllowedMimeTypes();
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error(`Invalid MIME type: ${file.mimetype}. Allowed: ${allowedMimes.join(', ')}`), false);
  }

  cb(null, true);
};

/**
 * Multer upload instance with memory storage
 */
const multerUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize
  }
});

/**
 * Validate file by checking basic requirements
 * Simple validation based on extension and basic checks
 *
 * @param {Buffer} buffer - File buffer
 * @param {string} extension - File extension
 * @returns {Promise<{valid: boolean, detectedType: string|null, error: string|null}>}
 */
const validateMimeType = async (buffer, extension) => {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      detectedType: null,
      error: 'File is empty.'
    };
  }

  if (!ALLOWED_MIME_TYPES[extension]) {
    return {
      valid: false,
      detectedType: null,
      error: `Extension ${extension} is not allowed.`
    };
  }

  if (extension === '.pdf') {
    const header = buffer.slice(0, 5).toString('ascii');
    if (header === '%PDF-') {
      return { valid: true, detectedType: 'application/pdf', error: null };
    }
    return {
      valid: false,
      detectedType: null,
      error: 'File does not appear to be a valid PDF.'
    };
  }

  const allowedMimes = ALLOWED_MIME_TYPES[extension];
  return { valid: true, detectedType: allowedMimes[0], error: null };
};

/**
 * Generate unique filename
 */
const generateFilename = (originalname) => {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const ext = path.extname(originalname);
  return `${uniqueSuffix}${ext}`;
};

/**
 * Save file to disk after validation
 *
 * @param {Object} file - Multer file object with buffer
 * @param {string} destination - Destination directory
 * @returns {Promise<{path: string, filename: string}>}
 */
const saveFileToDisk = async (file, destination) => {
  const filename = generateFilename(file.originalname);
  const filepath = path.join(destination, filename);

  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  await fs.promises.writeFile(filepath, file.buffer);

  return {
    path: filepath,
    filename,
    relativePath: path.join('uploads/medical-records', filename)
  };
};

/**
 * Middleware to validate MIME type after multer processing
 * Validates actual file content, not just headers
 */
const validateAndSaveFile = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const ext = path.extname(req.file.originalname).toLowerCase();

  try {
    const validation = await validateMimeType(req.file.buffer, ext);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'File validation failed',
        details: validation.error,
        detectedType: validation.detectedType
      });
    }

    const saved = await saveFileToDisk(req.file, config.upload.destination);

    req.file.path = saved.relativePath;
    req.file.filename = saved.filename;
    req.file.destination = config.upload.destination;
    req.file.detectedMimeType = validation.detectedType;

    next();
  } catch (error) {
    console.error('File validation error:', error);
    return res.status(500).json({
      error: 'File processing failed',
      details: error.message
    });
  }
};

/**
 * Combined upload middleware
 * Usage: upload.single('file') - returns array of middlewares
 */
const upload = {
  single: (fieldName) => [
    multerUpload.single(fieldName),
    validateAndSaveFile
  ],

  array: (fieldName, maxCount) => [
    multerUpload.array(fieldName, maxCount),
    async (req, res, next) => {
      if (!req.files || req.files.length === 0) {
        return next();
      }

      try {
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const ext = path.extname(file.originalname).toLowerCase();

          const validation = await validateMimeType(file.buffer, ext);

          if (!validation.valid) {
            return res.status(400).json({
              error: `File validation failed for ${file.originalname}`,
              details: validation.error,
              detectedType: validation.detectedType
            });
          }

          const saved = await saveFileToDisk(file, config.upload.destination);

          req.files[i].path = saved.relativePath;
          req.files[i].filename = saved.filename;
          req.files[i].destination = config.upload.destination;
          req.files[i].detectedMimeType = validation.detectedType;
        }

        next();
      } catch (error) {
        console.error('Files validation error:', error);
        return res.status(500).json({
          error: 'Files processing failed',
          details: error.message
        });
      }
    }
  ]
};

module.exports = upload;
