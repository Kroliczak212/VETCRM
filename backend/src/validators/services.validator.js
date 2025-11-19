const { z } = require('zod');

const createServiceSchema = z.object({
  body: z.object({
    name: z.string().min(3, 'Service name must be at least 3 characters'),
    category: z.string().min(2, 'Category is required'),
    price: z.number().positive('Price must be positive'),
    durationMinutes: z.number().int().positive('Duration must be positive'),
    description: z.string().optional()
  })
});

const updateServiceSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  }),
  body: z.object({
    name: z.string().min(3).optional(),
    category: z.string().min(2).optional(),
    price: z.number().positive().optional(),
    durationMinutes: z.number().int().positive().optional(),
    description: z.string().optional()
  })
});

const getServiceByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  })
});

module.exports = {
  createServiceSchema,
  updateServiceSchema,
  getServiceByIdSchema
};
