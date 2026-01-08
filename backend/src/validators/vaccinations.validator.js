const { z } = require('zod');

const createVaccinationSchema = z.object({
  body: z.object({
    petId: z.number().int().positive('Pet ID is required'),
    vaccinationTypeId: z.number().int().positive('Vaccination type is required'),
    vaccineName: z.string().min(2).optional(), // Auto-filled from vaccinationType
    vaccinationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Vaccination date must be in YYYY-MM-DD format'),
    nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Next due date must be in YYYY-MM-DD format').optional(),
    batchNumber: z.string().optional(),
    appointmentId: z.number().int().positive().optional(),
    notes: z.string().optional()
  })
});

const updateVaccinationSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  }),
  body: z.object({
    vaccineName: z.string().min(2).optional(),
    vaccinationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    nextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    batchNumber: z.string().optional(),
    notes: z.string().optional()
  })
});

const getVaccinationByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  })
});

const getUpcomingByPetSchema = z.object({
  params: z.object({
    petId: z.string().regex(/^\d+$/, 'Pet ID must be a number').transform(Number)
  }),
  query: z.object({
    daysAhead: z.string().regex(/^\d+$/).transform(Number).optional()
  }).optional()
});

module.exports = {
  createVaccinationSchema,
  updateVaccinationSchema,
  getVaccinationByIdSchema,
  getUpcomingByPetSchema
};
