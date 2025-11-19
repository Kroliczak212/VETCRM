const { z } = require('zod');

/**
 * Validation schema for creating a user (staff only)
 */
const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phone: z.string().min(9, 'Phone number must be at least 9 characters').optional(),
    roleId: z.number().int().min(1).max(3), // 1=admin, 2=receptionist, 3=doctor
    details: z.object({
      // Doctor details
      specialization: z.string().optional(),
      licenseNumber: z.string().optional(),
      experienceYears: z.number().int().min(0).optional(),
      // Receptionist details
      startDate: z.string().optional()
    }).optional()
  })
});

/**
 * Validation schema for updating a user
 */
const updateUserSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  }),
  body: z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    phone: z.string().min(9).optional(),
    password: z.string().min(6).optional(),
    details: z.object({
      specialization: z.string().optional(),
      licenseNumber: z.string().optional(),
      experienceYears: z.number().int().min(0).optional()
    }).optional()
  })
});

/**
 * Validation schema for getting user by ID
 */
const getUserByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  })
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  getUserByIdSchema
};
