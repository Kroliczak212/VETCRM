const { z } = require('zod');

/**
 * Validation schemas for penalties
 */

const createPenaltySchema = z.object({
  clientUserId: z.number().int().positive(),
  appointmentId: z.number().int().positive().optional(),
  amount: z.number().positive(),
  reason: z.string().min(1).max(500)
});

const getPenaltiesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  clientUserId: z.string().optional()
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
  validateCreatePenalty: validate(createPenaltySchema),
  validateGetPenaltiesQuery: validateQuery(getPenaltiesQuerySchema)
};
