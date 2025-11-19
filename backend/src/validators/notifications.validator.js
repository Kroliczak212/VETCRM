const { z } = require('zod');

/**
 * Validation schemas for notifications
 */

const createNotificationSchema = z.object({
  userId: z.number().int().positive(),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  type: z.enum(['reminder', 'system', 'warning', 'info'])
});

const updateNotificationSchema = z.object({
  isRead: z.boolean().optional()
});

const getNotificationsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  isRead: z.string().optional()
});

/**
 * Middleware to validate request body
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
  };
};

/**
 * Middleware to validate query parameters
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
  };
};

module.exports = {
  validateCreateNotification: validate(createNotificationSchema),
  validateUpdateNotification: validate(updateNotificationSchema),
  validateGetNotificationsQuery: validateQuery(getNotificationsQuerySchema)
};
