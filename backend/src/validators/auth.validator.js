const { z } = require('zod');

/**
 * Validation schema for user registration
 */
const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phone: z.string().min(9, 'Phone number must be at least 9 characters'),
    roleId: z.number().int().positive('Role ID must be a positive integer').default(4) // Default to client role
  })
});

/**
 * Validation schema for user login
 */
const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  })
});

module.exports = {
  registerSchema,
  loginSchema
};
