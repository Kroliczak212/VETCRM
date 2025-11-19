const { z } = require('zod');

const createClientSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phone: z.string().min(9, 'Phone number must be at least 9 characters'),
    address: z.string().optional(),
    notes: z.string().optional()
  })
});

const updateClientSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  }),
  body: z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    phone: z.string().min(9).optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    password: z.string().min(6).optional()
  })
});

const getClientByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  })
});

module.exports = {
  createClientSchema,
  updateClientSchema,
  getClientByIdSchema
};
