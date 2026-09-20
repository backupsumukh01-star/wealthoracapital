import { z } from 'zod'

const salesmanEmailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address.')
  .transform((value) => value.toLowerCase())

export const salesLoginSchema = z
  .object({
    email: salesmanEmailSchema,
    password: z.string().min(1, 'Password is required.'),
  })
  .strict()

export const salesmanIdParamSchema = z.object({
  salesmanId: z.string().uuid(),
})

export const createSalesmanSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(120),
    email: salesmanEmailSchema,
    code: z.preprocess((val) => {
      if (val === undefined || val === null) return undefined
      if (typeof val !== 'string') return val
      const trimmed = val.trim().toUpperCase()
      return trimmed.length > 0 ? trimmed : undefined
    }, z
      .string()
      .min(2)
      .max(16)
      .regex(/^S[A-Z0-9]{1,15}$/, 'Code must start with S and use letters or digits.')
      .optional()),
  })
  .strict()

export const updateSalesmanSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: salesmanEmailSchema.optional(),
    status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  })
  .strict()
  .refine((value) => value.name !== undefined || value.email !== undefined || value.status !== undefined, {
    message: 'Provide at least one field to update.',
  })

export const salesNetworkUserIdParamSchema = z.object({
  userId: z.string().uuid(),
})

export const ownerNetworkUserParamSchema = z.object({
  salesmanId: z.string().uuid(),
  userId: z.string().uuid(),
})