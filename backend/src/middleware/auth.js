const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const config = require('../config');

/**
 * Authentication middleware - verifies JWT token
 * Attaches user data to req.user
 *
 * @param {Array<string>} allowedRoles - Optional array of roles that can access the route
 * @returns {Function} Express middleware
 *
 * @example
 * // Any authenticated user
 * router.get('/profile', authenticate(), getProfile);
 *
 * // Only doctors and receptionists
 * router.post('/appointments', authenticate(['doctor', 'receptionist']), createAppointment);
 */
const authenticate = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('No token provided');
      }

      const token = authHeader.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);

      // Attach user data to request
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      };

      // Check role-based authorization
      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (err) {
      // Let error handler middleware deal with JWT errors
      next(err);
    }
  };
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for endpoints that behave differently for authenticated users
 */
const optionalAuth = () => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role
        };
      }
    } catch (err) {
      // Silently fail - user remains unauthenticated
    }
    next();
  };
};

/**
 * Authorization middleware - checks if user has required role
 * Must be used AFTER authenticate middleware
 *
 * @param {Array<string>} allowedRoles - Array of roles that can access the route
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/admin', authenticate, authorize(['admin']), handler);
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { authenticate, optionalAuth, authorize };
