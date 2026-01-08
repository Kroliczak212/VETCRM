const { AppError } = require('../utils/errors');
const config = require('../config');

/**
 * Global error handling middleware
 * Catches all errors and returns consistent JSON responses
 */
const errorHandler = (err, req, res, next) => {
  if (config.env === 'development') {
    console.error({
      timestamp: new Date().toISOString(),
      error: err.message,
      code: err.code,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      errors: err.errors // Include detailed validation errors
    });
  }

  let statusCode = 500;
  let response = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  };

  if (err.isOperational) {
    statusCode = err.statusCode;
    response = {
      error: err.message,
      code: err.code
    };

    if (err.errors) {
      response.errors = err.errors;
    }
  }

  else if (err.code && err.code.startsWith('ER_')) {
    statusCode = 400;
    response = handleMySQLError(err);
  }

  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    response = { error: 'Invalid token', code: 'INVALID_TOKEN' };
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    response = { error: 'Token expired', code: 'TOKEN_EXPIRED' };
  }

  else if (err.name === 'MulterError') {
    statusCode = 400;
    response = handleMulterError(err);
  }

  // SECURITY: Never expose stack traces to client, even in development
  // Stack traces can reveal sensitive file paths and code structure

  res.status(statusCode).json(response);
};

/**
 * Handle MySQL-specific errors
 */
const handleMySQLError = (err) => {
  switch (err.code) {
    case 'ER_DUP_ENTRY':
      return {
        error: 'Duplicate entry - resource already exists',
        code: 'DUPLICATE_ENTRY'
      };
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return {
        error: 'Referenced resource does not exist',
        code: 'INVALID_REFERENCE'
      };
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return {
        error: 'Cannot delete - resource is referenced by other records',
        code: 'REFERENCE_CONSTRAINT'
      };
    default:
      return {
        error: 'Database error',
        code: 'DATABASE_ERROR'
      };
  }
};

/**
 * Handle Multer file upload errors
 */
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return {
      error: 'File too large',
      code: 'FILE_TOO_LARGE'
    };
  }
  return {
    error: 'File upload error',
    code: 'UPLOAD_ERROR'
  };
};

/**
 * 404 handler - must be registered after all routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path
  });
};

module.exports = { errorHandler, notFoundHandler };
