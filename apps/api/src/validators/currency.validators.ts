import { z } from 'zod'
import { DISPLAY_CURRENCIES } from '@meridian/shared'

export const convertQuerySchema = z.object({
  amountUsd: z
    .string()
    .regex(/^\d+(\.\d{1,8})?$/, 'amountUsd must be a positive decimal string.')
    .refine((v) => Number(v) >= 0, 'amountUsd must be >= 0'),
  to: z.enum(DISPLAY_CURRENCIES),
})

export const updateDisplayCurrencySchema = z.object({
  displayCurrency: z.enum(DISPLAY_CURRENCIES),
})
