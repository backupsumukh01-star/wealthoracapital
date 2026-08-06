import { z } from 'zod'

export const updateMySettingsSchema = z.object({
  timezone: z.string().trim().min(1).max(64).optional(),
  language: z.string().trim().min(2).max(10).optional(),
  marketingOptIn: z.boolean().optional(),
})

export const adminSettingsUpdateSchema = z.object({
  companyName: z.string().trim().min(1).max(120).optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().trim().max(40).nullable().optional(),
  defaultCurrency: z.string().trim().length(3).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  maintenanceMode: z.boolean().optional(),
  networks: z.array(z.string().trim().min(1).max(40)).optional(),
  coins: z.array(z.string().trim().min(1).max(20)).optional(),
  minDeposit: z.string().optional(),
  maxDeposit: z.string().optional(),
  minWithdrawal: z.string().optional(),
  maxWithdrawal: z.string().optional(),
  /** Desk USD→INR rate; must be a positive decimal string. */
  usdInrRate: z
    .string()
    .regex(/^\d+(\.\d{1,8})?$/, 'Exchange rate must be a positive decimal.')
    .refine((v) => Number(v) > 0, 'Exchange rate must be greater than zero.')
    .optional(),
})

export const featureFlagsUpdateSchema = z.record(z.string(), z.boolean())
