const { z } = require('zod');

const createPetSchema = z.object({
  body: z.object({
    ownerId: z.number().int().positive('Owner ID is required'),
    name: z.string().min(2, 'Pet name must be at least 2 characters'),
    species: z.string().min(2, 'Species is required'),
    breed: z.string().optional(),
    sex: z.enum(['male', 'female', 'unknown']).optional(),
    dateOfBirth: z.string().optional(), // ISO date string
    notes: z.string().optional(),
    weight: z.number().positive().optional(),
    microchipNumber: z.string().optional()
  })
});

const updatePetSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    species: z.string().min(2).optional(),
    breed: z.string().optional(),
    sex: z.enum(['male', 'female', 'unknown']).optional(),
    dateOfBirth: z.string().optional(),
    notes: z.string().optional(),
    weight: z.number().positive().optional(),
    microchipNumber: z.string().optional()
  })
});

const getPetByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  })
});

const getDocumentationSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  }),
  query: z.object({
    startDate: z.string().datetime({ message: 'Start date must be a valid ISO 8601 datetime' }).optional(),
    endDate: z.string().datetime({ message: 'End date must be a valid ISO 8601 datetime' }).optional()
  })
});

// Schema for client self-service pet creation (no ownerId required)
const createPetByClientSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Pet name must be at least 2 characters'),
    species: z.string().min(2, 'Species is required'),
    breed: z.string().optional(),
    sex: z.enum(['male', 'female', 'unknown']).optional(),
    dateOfBirth: z.string().optional(),
    notes: z.string().optional(),
    weight: z.number().positive().optional(),
    microchipNumber: z.string().optional()
  })
});

module.exports = {
  createPetSchema,
  updatePetSchema,
  getPetByIdSchema,
  getDocumentationSchema,
  createPetByClientSchema
};
