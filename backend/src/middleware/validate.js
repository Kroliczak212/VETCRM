const { z } = require('zod');
const { ValidationError } = require('../utils/errors');

/**
 * Validation middleware using Zod schemas
 *
 * @param {Object} schema - Zod schema object with body/query/params properties
 * @returns {Function} Express middleware
 *
 * @example
 * const schema = z.object({
 *   body: z.object({
 *     email: z.string().email(),
 *     password: z.string().min(6)
 *   })
 * });
 * router.post('/login', validate(schema), controller.login);
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code
        }));

        throw new ValidationError('Validation failed', errors);
      }
      throw err;
    }
  };
};

module.exports = validate;
