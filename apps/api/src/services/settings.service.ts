import type { Prisma } from '@prisma/client'
import {
  DEFAULT_CURRENCY_RATES,
  DEFAULT_DISPLAY_CURRENCY,
  DISPLAY_CURRENCIES,
  isDisplayCurrency,
  normalizeCurrencyRates,
  type CurrencyRatesMap,
} from '@meridian/shared'

import { prisma } from '../database/prisma.js'
import { moneyDisplay, d } from '../utils/money.js'
import { DEFAULT_USD_INR_RATE, rateDisplay } from '../utils/fx.js'
import { userRepository } from '../repositories/user.repository.js'
import { profileRepository } from '../repositories/profile.repository.js'
import { notFound, badRequest } from '../utils/errors.js'
import { auditService } from './audit.service.js'
import { parseCurrencyRatesJson } from './finance/currency.service.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

const DEFAULT_NETWORKS = ['TRC20', 'BEP20', 'ERC20', 'BTC']
const DEFAULT_COINS = ['USDT', 'BTC', 'ETH']

function mapSettings(row: {
  companyName: string
  supportEmail: string
  supportPhone: string | null
  defaultCurrency: string
  timezone: string
  maintenanceMode: boolean
  networks: Prisma.JsonValue
  coins: Prisma.JsonValue
  minDeposit: Prisma.Decimal
  maxDeposit: Prisma.Decimal
  minWithdrawal: Prisma.Decimal
  maxWithdrawal: Prisma.Decimal
  usdInrRate: Prisma.Decimal
  currencyRates: Prisma.JsonValue
  referralPercent: Prisma.Decimal
  referralUnlockDays: number
  referralEnabled: boolean
}) {
  const rates = normalizeCurrencyRates({
    ...parseCurrencyRatesJson(row.currencyRates),
    INR: rateDisplay(row.usdInrRate ?? DEFAULT_USD_INR_RATE),
  })

  return {
    companyName: row.companyName,
    supportEmail: row.supportEmail,
    supportPhone: row.supportPhone,
    defaultCurrency: row.defaultCurrency,
    timezone: row.timezone,
    maintenanceMode: row.maintenanceMode,
    networks: Array.isArray(row.networks) ? (row.networks as string[]) : DEFAULT_NETWORKS,
    coins: Array.isArray(row.coins) ? (row.coins as string[]) : DEFAULT_COINS,
    usdInrRate: rates.INR,
    currencyRates: rates,
    supportedCurrencies: [...DISPLAY_CURRENCIES],
    limits: {
      minDeposit: moneyDisplay(row.minDeposit),
      maxDeposit: moneyDisplay(row.maxDeposit),
      minWithdrawal: moneyDisplay(row.minWithdrawal),
      maxWithdrawal: moneyDisplay(row.maxWithdrawal),
    },
    referral: {
      enabled: row.referralEnabled,
      percent: d(row.referralPercent).toFixed(4),
      unlockDays: row.referralUnlockDays,
    },
  }
}

function mergeRatesUpdate(
  existing: Prisma.JsonValue,
  usdInrRate: string | undefined,
  currencyRates: CurrencyRatesMap | undefined,
): { rates: Record<string, string>; usdInr: string } {
  const current = normalizeCurrencyRates(parseCurrencyRatesJson(existing))
  const next = normalizeCurrencyRates({
    ...current,
    ...(currencyRates ?? {}),
    ...(usdInrRate !== undefined ? { INR: usdInrRate } : {}),
  })
  return { rates: next, usdInr: next.INR }
}

export const settingsService = {
  async getOrInitPlatformSettings() {
    const existing = await prisma.platformSetting.findFirst()
    if (existing) {
      // Backfill empty currencyRates from usdInrRate without rewriting history.
      const parsed = parseCurrencyRatesJson(existing.currencyRates)
      if (Object.keys(parsed).length === 0) {
        const rates = normalizeCurrencyRates({
          ...DEFAULT_CURRENCY_RATES,
          INR: rateDisplay(existing.usdInrRate ?? DEFAULT_USD_INR_RATE),
        })
        return prisma.platformSetting.update({
          where: { id: existing.id },
          data: { currencyRates: rates },
        })
      }
      return existing
    }
    const rates = normalizeCurrencyRates(DEFAULT_CURRENCY_RATES)
    return prisma.platformSetting.create({
      data: {
        networks: DEFAULT_NETWORKS,
        coins: DEFAULT_COINS,
        usdInrRate: rates.INR,
        currencyRates: rates,
      },
    })
  },

  async getPublicSettings() {
    const [settings, flags] = await Promise.all([
      this.getOrInitPlatformSettings(),
      prisma.featureFlag.findMany(),
    ])
    const mapped = mapSettings(settings)
    return {
      companyName: mapped.companyName,
      supportEmail: mapped.supportEmail,
      defaultCurrency: mapped.defaultCurrency,
      maintenanceMode: mapped.maintenanceMode,
      usdInrRate: mapped.usdInrRate,
      currencyRates: mapped.currencyRates,
      supportedCurrencies: mapped.supportedCurrencies,
      featureFlags: Object.fromEntries(flags.map((f) => [f.key, f.enabled])),
      limits: mapped.limits,
    }
  },

  async getMySettings(userId: string) {
    const user = await userRepository.findById(userId)
    if (!user) throw notFound('User not found.')
    const profile = await profileRepository.ensure(userId)
    const displayCurrency = isDisplayCurrency(profile.displayCurrency)
      ? profile.displayCurrency
      : DEFAULT_DISPLAY_CURRENCY
    return {
      timezone: user.timezone,
      language: profile.language,
      displayCurrency,
      marketingOptIn: user.marketingOptIn,
      twoFactorEnabled: user.twoFactorEnabled,
      emailNotifications: true,
    }
  },

  async updateMySettings(
    userId: string,
    body: Partial<{
      timezone: string
      language: string
      marketingOptIn: boolean
      displayCurrency: string
    }>,
    context: Ctx,
  ) {
    await userRepository.update(userId, {
      ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
      ...(body.marketingOptIn !== undefined ? { marketingOptIn: body.marketingOptIn } : {}),
    })
    const profilePatch: Prisma.UserProfileUpdateInput = {}
    if (body.language !== undefined) profilePatch.language = body.language
    if (body.displayCurrency !== undefined) {
      if (!isDisplayCurrency(body.displayCurrency)) {
        throw badRequest('Unsupported display currency.')
      }
      profilePatch.displayCurrency = body.displayCurrency
    }
    if (Object.keys(profilePatch).length > 0) {
      await profileRepository.upsert(userId, profilePatch)
    }
    await auditService.record({
      actorId: userId,
      action: 'settings.update_me',
      module: 'settings',
      newValue: body,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return this.getMySettings(userId)
  },

  async adminGet() {
    return mapSettings(await this.getOrInitPlatformSettings())
  },

  async adminUpdate(
    actorId: string,
    body: Partial<{
      companyName: string
      supportEmail: string
      supportPhone: string | null
      defaultCurrency: string
      timezone: string
      maintenanceMode: boolean
      networks: string[]
      coins: string[]
      minDeposit: string
      maxDeposit: string
      minWithdrawal: string
      maxWithdrawal: string
      usdInrRate: string
      currencyRates: CurrencyRatesMap
      referralPercent: string
      referralUnlockDays: number
      referralEnabled: boolean
    }>,
    context: Ctx,
  ) {
    const existing = await this.getOrInitPlatformSettings()
    const { rates, usdInr } = mergeRatesUpdate(
      existing.currencyRates,
      body.usdInrRate,
      body.currencyRates,
    )

    const updated = await prisma.platformSetting.update({
      where: { id: existing.id },
      data: {
        ...(body.companyName !== undefined ? { companyName: body.companyName } : {}),
        ...(body.supportEmail !== undefined ? { supportEmail: body.supportEmail } : {}),
        ...(body.supportPhone !== undefined ? { supportPhone: body.supportPhone } : {}),
        ...(body.defaultCurrency !== undefined ? { defaultCurrency: body.defaultCurrency } : {}),
        ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
        ...(body.maintenanceMode !== undefined ? { maintenanceMode: body.maintenanceMode } : {}),
        ...(body.networks !== undefined ? { networks: body.networks } : {}),
        ...(body.coins !== undefined ? { coins: body.coins } : {}),
        ...(body.minDeposit !== undefined ? { minDeposit: body.minDeposit } : {}),
        ...(body.maxDeposit !== undefined ? { maxDeposit: body.maxDeposit } : {}),
        ...(body.minWithdrawal !== undefined ? { minWithdrawal: body.minWithdrawal } : {}),
        ...(body.maxWithdrawal !== undefined ? { maxWithdrawal: body.maxWithdrawal } : {}),
        ...(body.usdInrRate !== undefined || body.currencyRates !== undefined
          ? { usdInrRate: usdInr, currencyRates: rates }
          : {}),
        ...(body.referralPercent !== undefined ? { referralPercent: body.referralPercent } : {}),
        ...(body.referralUnlockDays !== undefined
          ? { referralUnlockDays: body.referralUnlockDays }
          : {}),
        ...(body.referralEnabled !== undefined ? { referralEnabled: body.referralEnabled } : {}),
        updatedById: actorId,
      },
    })
    await auditService.record({
      actorId,
      action: 'settings.update',
      module: 'settings',
      newValue: body,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapSettings(updated)
  },

  async listFeatureFlags() {
    const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } })
    return Object.fromEntries(flags.map((f) => [f.key, f.enabled]))
  },

  async updateFeatureFlags(actorId: string, body: Record<string, boolean>, context: Ctx) {
    for (const [key, enabled] of Object.entries(body)) {
      await prisma.featureFlag.upsert({
        where: { key },
        create: { key, enabled, updatedById: actorId },
        update: { enabled, updatedById: actorId },
      })
    }
    await auditService.record({
      actorId,
      action: 'settings.feature_flags_update',
      module: 'settings',
      newValue: body,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return this.listFeatureFlags()
  },
}
