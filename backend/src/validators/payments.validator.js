const { z } = require('zod');

/**
 * Validation schemas for payments
 */

const createPaymentSchema = z.object({
  appointmentId: z.number().int().positive(),
  amountDue: z.number().positive(),
  paymentMethod: z.enum(['cash', 'card', 'online']).optional()
});

const updatePaymentSchema = z.object({
  amountPaid: z.number().positive().optional(),
  paymentMethod: z.enum(['cash', 'card', 'online']).optional(),
  paymentDate: z.string().datetime().optional()
});

const getPaymentsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['unpaid', 'partially_paid', 'paid']).optional(),
  appointmentId: z.string().optional()
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
  validateCreatePayment: validate(createPaymentSchema),
  validateUpdatePayment: validate(updatePaymentSchema),
  validateGetPaymentsQuery: validateQuery(getPaymentsQuerySchema)
};
