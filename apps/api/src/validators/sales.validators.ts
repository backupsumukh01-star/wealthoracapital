import { z } from 'zod'

export const salesLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Password is required.'),
})

export const salesmanIdParamSchema = z.object({
  salesmanId: z.string().uuid(),
})
