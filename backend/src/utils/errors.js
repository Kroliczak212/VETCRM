/**
 * Base application error
 * All custom errors extend from this class
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Distinguish operational errors from programmer errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Generic bad request
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

/**
 * 400 Bad Request - Validation errors
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors; // Array of field-specific errors
  }
}

/**
 * 401 Unauthorized - Authentication required
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

/**
 * 403 Forbidden - Account deactivated
 */
class AccountDeactivatedError extends AppError {
  constructor(message = 'Account has been deactivated. Contact support for assistance.') {
    super(message, 403, 'ACCOUNT_DEACTIVATED');
  }
}

/**
 * 403 Forbidden - Insufficient permissions
 */
class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 404 Not Found - Resource doesn't exist
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * 409 Conflict - Duplicate resource or constraint violation
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * 500 Internal Server Error - Unexpected errors
 */
class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

module.exports = {
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  AccountDeactivatedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalError
};
