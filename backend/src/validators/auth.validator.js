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

/**
 * Validation schema for forgot password request
 */
const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format')
  })
});

/**
 * Validation schema for password reset
 */
const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().length(64, 'Invalid token format'), // 32 bytes hex = 64 chars
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character')
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
