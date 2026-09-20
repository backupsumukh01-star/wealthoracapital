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

/** Salesman promo codes: 2–16 A–Z / 0–9 after trim + uppercase. Leading S is optional. */
export const SALESMAN_CODE_REGEX = /^[A-Z0-9]{2,16}$/
const salesmanCodeMessage = 'Code must be 2–16 letters or digits.'

const optionalSalesmanCodeSchema = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined
  if (typeof val !== 'string') return val
  const trimmed = val.trim().toUpperCase()
  return trimmed.length > 0 ? trimmed : undefined
}, z.string().min(2).max(16).regex(SALESMAN_CODE_REGEX, salesmanCodeMessage).optional())

/** Present code field: trim/uppercase; empty/whitespace rejected (not treated as omit). */
const updateSalesmanCodeSchema = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined
  if (typeof val !== 'string') return val
  return val.trim().toUpperCase()
}, z.string().min(2, 'Code is required.').max(16).regex(SALESMAN_CODE_REGEX, salesmanCodeMessage).optional())

export const createSalesmanSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(120),
    email: salesmanEmailSchema,
    code: optionalSalesmanCodeSchema,
  })
  .strict()

export const updateSalesmanSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: salesmanEmailSchema.optional(),
    status: z.enum(['ACTIVE', 'DISABLED']).optional(),
    code: updateSalesmanCodeSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.email !== undefined ||
      value.status !== undefined ||
      value.code !== undefined,
    {
      message: 'Provide at least one field to update.',
    },
  )

export const salesNetworkUserIdParamSchema = z.object({
  userId: z.string().uuid(),
})

export const ownerNetworkUserParamSchema = z.object({
  salesmanId: z.string().uuid(),
  userId: z.string().uuid(),
})