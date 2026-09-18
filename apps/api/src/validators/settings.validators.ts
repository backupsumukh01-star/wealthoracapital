import { z } from 'zod'
import { DISPLAY_CURRENCIES } from '@meridian/shared'

const positiveRate = z
  .string()
  .regex(/^\d+(\.\d{1,8})?$/, 'Exchange rate must be a positive decimal.')
  .refine((v) => Number(v) > 0, 'Exchange rate must be greater than zero.')

const positiveMoney = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,8})?$/, 'Amount must be a positive decimal.')
  .refine((v) => Number(v) > 0, 'Amount must be greater than zero.')

export const updateMySettingsSchema = z.object({
  timezone: z.string().trim().min(1).max(64).optional(),
  language: z.string().trim().min(2).max(10).optional(),
  marketingOptIn: z.boolean().optional(),
  displayCurrency: z.enum(DISPLAY_CURRENCIES).optional(),
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
  minDeposit: positiveMoney.optional(),
  maxDeposit: positiveMoney.optional(),
  minWithdrawal: positiveMoney.optional(),
  maxWithdrawal: positiveMoney.optional(),
  /** Desk USD→INR rate; must be a positive decimal string. Synced into currencyRates.INR. */
  usdInrRate: positiveRate.optional(),
  /** Full display-rate map (units of currency per 1 USD). Does not rewrite history. */
  currencyRates: z.record(z.string(), positiveRate).optional(),
  referralPercent: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, 'Referral percent must be a decimal with up to 4 places.')
    .refine((v) => {
      // Decimal-safe bounds check without floating-point drift on common percents.
      const [whole, frac = ''] = v.split('.')
      const padded = `${whole}.${frac.padEnd(4, '0')}`
      const asInt = Number.parseInt(padded.replace('.', ''), 10)
      return Number.isFinite(asInt) && asInt >= 0 && asInt <= 100_0000
    }, 'Referral percent must be between 0 and 100.')
    .optional(),
  referralUnlockDays: z.coerce.number().int().min(1).max(3650).optional(),
  referralEnabled: z.boolean().optional(),
})

export const featureFlagsUpdateSchema = z.record(z.string(), z.boolean())
