import { z } from 'zod'

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  phone: z.string().trim().min(5).max(24).nullable().optional(),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase())
    .nullable()
    .optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  language: z.string().trim().min(2).max(10).optional(),
  addressLine1: z.string().trim().max(120).nullable().optional(),
  addressLine2: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  state: z.string().trim().max(80).nullable().optional(),
  postalCode: z.string().trim().max(24).nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
})
