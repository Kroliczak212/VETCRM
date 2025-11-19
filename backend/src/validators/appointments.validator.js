const { z } = require('zod');

const createAppointmentSchema = z.object({
  body: z.object({
    petId: z.number().int().positive('Pet ID is required'),
    doctorId: z.number().int().positive('Doctor ID is required'),
    scheduledAt: z.string().datetime('Invalid datetime format'),
    durationMinutes: z.number().int().positive('Duration must be positive'),
    reason: z.string().optional().transform(val => val === '' ? undefined : val),
    location: z.string().optional().transform(val => val === '' ? undefined : val),
    services: z.array(z.object({
      serviceId: z.number().int().positive(),
      quantity: z.number().int().positive().optional(),
      unitPrice: z.number().positive()
    })).optional()
  })
});

const updateAppointmentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  }),
  body: z.object({
    scheduledAt: z.string().datetime().optional(),
    durationMinutes: z.number().int().positive().optional(),
    reason: z.string().min(5).optional(),
    location: z.string().optional(),
    services: z.array(z.object({
      serviceId: z.number().int().positive(),
      quantity: z.number().int().positive().optional(),
      unitPrice: z.number().positive()
    })).optional()
  })
});

const updateStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  }),
  body: z.object({
    status: z.enum(['proposed', 'confirmed', 'in_progress', 'completed', 'cancelled', 'cancelled_late'])
  })
});

const getAppointmentByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number)
  })
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateStatusSchema,
  getAppointmentByIdSchema
};
