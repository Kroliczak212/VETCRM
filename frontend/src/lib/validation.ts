import { z } from 'zod';

export const appointmentFormSchema = z.object({
  petId: z.number({
    required_error: 'Zwierzę jest wymagane',
    invalid_type_error: 'Nieprawidłowy ID zwierzęcia',
  }).positive('ID zwierzęcia musi być liczbą dodatnią'),

  doctorId: z.number({
    required_error: 'Lekarz jest wymagany',
    invalid_type_error: 'Nieprawidłowy ID lekarza',
  }).positive('ID lekarza musi być liczbą dodatnią'),

  scheduledAt: z.string({
    required_error: 'Data i godzina są wymagane',
  }).refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Nieprawidłowy format daty'),

  durationMinutes: z.number({
    invalid_type_error: 'Czas trwania musi być liczbą',
  }).positive('Czas trwania musi być liczbą dodatnią').default(45),

  reason: z.string().max(500, 'Powód nie może przekraczać 500 znaków').optional().or(z.literal('')),

  location: z.string().max(200, 'Lokalizacja nie może przekraczać 200 znaków').optional().or(z.literal('')),

  reasonId: z.number({
    invalid_type_error: 'Nieprawidłowy ID powodu',
  }).positive('ID powodu musi być liczbą dodatnią').optional(),

  vaccinationTypeId: z.number({
    invalid_type_error: 'Nieprawidłowy ID typu szczepienia',
  }).positive('ID typu szczepienia musi być liczbą dodatnią').optional(),
});

export type AppointmentFormData = z.infer<typeof appointmentFormSchema>;

export const phoneRegex = /^[\d\s\-\+\(\)]+$/;
export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const clientFormSchema = z.object({
  first_name: z.string({
    required_error: 'Imię jest wymagane',
  })
    .min(2, 'Imię musi mieć co najmniej 2 znaki')
    .max(50, 'Imię nie może przekraczać 50 znaków')
    .trim(),

  last_name: z.string({
    required_error: 'Nazwisko jest wymagane',
  })
    .min(2, 'Nazwisko musi mieć co najmniej 2 znaki')
    .max(50, 'Nazwisko nie może przekraczać 50 znaków')
    .trim(),

  email: z.string({
    required_error: 'Email jest wymagany',
  })
    .email('Nieprawidłowy format email')
    .max(100, 'Email nie może przekraczać 100 znaków')
    .toLowerCase()
    .trim(),

  phone: z.string({
    required_error: 'Telefon jest wymagany',
  })
    .min(9, 'Numer telefonu musi mieć co najmniej 9 znaków')
    .max(15, 'Numer telefonu nie może przekraczać 15 znaków')
    .regex(phoneRegex, 'Numer telefonu może zawierać tylko cyfry, spacje i znaki: + - ( )')
    .trim(),

  address: z.string()
    .max(200, 'Adres nie może przekraczać 200 znaków')
    .trim()
    .optional()
    .or(z.literal('')),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;

export const petFormSchema = z.object({
  name: z.string({
    required_error: 'Imię zwierzęcia jest wymagane',
  })
    .min(1, 'Imię zwierzęcia jest wymagane')
    .max(50, 'Imię zwierzęcia nie może przekraczać 50 znaków')
    .trim(),

  species: z.string({
    required_error: 'Gatunek jest wymagany',
  })
    .min(1, 'Gatunek jest wymagany')
    .max(50, 'Gatunek nie może przekraczać 50 znaków')
    .trim(),

  breed: z.string()
    .max(50, 'Rasa nie może przekraczać 50 znaków')
    .trim()
    .optional()
    .or(z.literal('')),

  date_of_birth: z.string()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      return !isNaN(date.getTime()) && date <= new Date();
    }, 'Data urodzenia nie może być w przyszłości')
    .optional()
    .or(z.literal('')),

  weight: z.number({
    invalid_type_error: 'Waga musi być liczbą',
  })
    .positive('Waga musi być liczbą dodatnią')
    .max(1000, 'Waga nie może przekraczać 1000 kg')
    .optional(),

  color: z.string()
    .max(50, 'Kolor nie może przekraczać 50 znaków')
    .trim()
    .optional()
    .or(z.literal('')),

  microchip_number: z.string()
    .max(50, 'Numer microchipa nie może przekraczać 50 znaków')
    .trim()
    .optional()
    .or(z.literal('')),

  notes: z.string()
    .max(1000, 'Notatki nie mogą przekraczać 1000 znaków')
    .trim()
    .optional()
    .or(z.literal('')),
});

export type PetFormData = z.infer<typeof petFormSchema>;

export const userFormSchema = z.object({
  first_name: z.string({
    required_error: 'Imię jest wymagane',
  })
    .min(2, 'Imię musi mieć co najmniej 2 znaki')
    .max(50, 'Imię nie może przekraczać 50 znaków')
    .trim(),

  last_name: z.string({
    required_error: 'Nazwisko jest wymagane',
  })
    .min(2, 'Nazwisko musi mieć co najmniej 2 znaki')
    .max(50, 'Nazwisko nie może przekraczać 50 znaków')
    .trim(),

  email: z.string({
    required_error: 'Email jest wymagany',
  })
    .email('Nieprawidłowy format email')
    .max(100, 'Email nie może przekraczać 100 znaków')
    .toLowerCase()
    .trim(),

  phone: z.string()
    .min(9, 'Numer telefonu musi mieć co najmniej 9 znaków')
    .max(15, 'Numer telefonu nie może przekraczać 15 znaków')
    .regex(phoneRegex, 'Numer telefonu może zawierać tylko cyfry, spacje i znaki: + - ( )')
    .trim()
    .optional()
    .or(z.literal('')),

  role: z.enum(['admin', 'receptionist', 'doctor', 'client'], {
    required_error: 'Rola jest wymagana',
  }),
});

export type UserFormData = z.infer<typeof userFormSchema>;

export const paymentFormSchema = z.object({
  amount: z.number({
    required_error: 'Kwota jest wymagana',
    invalid_type_error: 'Kwota musi być liczbą',
  })
    .positive('Kwota musi być liczbą dodatnią')
    .max(1000000, 'Kwota nie może przekraczać 1,000,000'),

  payment_method: z.enum(['cash', 'card', 'transfer', 'other'], {
    required_error: 'Metoda płatności jest wymagana',
  }),

  description: z.string()
    .max(500, 'Opis nie może przekraczać 500 znaków')
    .trim()
    .optional()
    .or(z.literal('')),
});

export type PaymentFormData = z.infer<typeof paymentFormSchema>;

export const sanitizeString = (str: string): string => {
  return str.trim().replace(/\s+/g, ' ');
};

export const sanitizeFormData = <T extends Record<string, any>>(data: T): T => {
  const sanitized = { ...data };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    }
  }

  return sanitized;
};

export const validateAndSanitize = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } => {
  try {
    const sanitized = typeof data === 'object' && data !== null
      ? sanitizeFormData(data as Record<string, any>)
      : data;

    const validated = schema.parse(sanitized);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
};
