import {
  DEFAULT_DISPLAY_CURRENCY,
  DISPLAY_CURRENCIES,
  convertFromUsd,
  isDisplayCurrency,
  type DisplayCurrency,
} from '@meridian/shared'

import { profileRepository } from '../../repositories/profile.repository.js'
import { auditService } from '../audit.service.js'
import { getPlatformCurrencyRates } from './currency.service.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

export const currencyServiceHandlers = {
  async getRates() {
    const rates = await getPlatformCurrencyRates()
    return {
      base: 'USD' as const,
      rates,
      supported: [...DISPLAY_CURRENCIES],
    }
  },

  async convert(amountUsd: string, to: string) {
    const rates = await getPlatformCurrencyRates()
    const target = isDisplayCurrency(to) ? to : DEFAULT_DISPLAY_CURRENCY
    const converted = convertFromUsd(amountUsd, target, rates)
    return {
      amountUsd,
      currency: target,
      amount: converted,
      rate: rates[target],
      base: 'USD' as const,
    }
  },

  async getMyPreference(userId: string) {
    const profile = await profileRepository.ensure(userId)
    const displayCurrency = isDisplayCurrency(profile.displayCurrency)
      ? profile.displayCurrency
      : DEFAULT_DISPLAY_CURRENCY
    return { displayCurrency }
  },

  async updateMyPreference(
    userId: string,
    body: { displayCurrency: string },
    context: Ctx,
  ) {
    const displayCurrency = (
      isDisplayCurrency(body.displayCurrency) ? body.displayCurrency : DEFAULT_DISPLAY_CURRENCY
    ) as DisplayCurrency
    await profileRepository.upsert(userId, { displayCurrency })
    await auditService.record({
      actorId: userId,
      action: 'settings.display_currency',
      module: 'settings',
      newValue: { displayCurrency },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return { displayCurrency }
  },
}
