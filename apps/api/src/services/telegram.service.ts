import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

export type TelegramBotKind = 'KYC' | 'DEPOSIT' | 'WITHDRAWAL'

type BotConfig = { token: string; chatId: string }

function botConfig(kind: TelegramBotKind): BotConfig | null {
  const map: Record<TelegramBotKind, BotConfig> = {
    KYC: { token: env.TELEGRAM_KYC_BOT_TOKEN.trim(), chatId: env.TELEGRAM_KYC_CHAT_ID.trim() },
    DEPOSIT: {
      token: env.TELEGRAM_DEPOSIT_BOT_TOKEN.trim(),
      chatId: env.TELEGRAM_DEPOSIT_CHAT_ID.trim(),
    },
    WITHDRAWAL: {
      token: env.TELEGRAM_WITHDRAWAL_BOT_TOKEN.trim(),
      chatId: env.TELEGRAM_WITHDRAWAL_CHAT_ID.trim(),
    },
  }
  const cfg = map[kind]
  if (!cfg.token || !cfg.chatId) return null
  return cfg
}

/** Escape Telegram MarkdownV2 special characters in plain text segments. */
export function escapeTelegramMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (ch) => `\\${ch}`)
}

/**
 * Admin Telegram fan-out. Never throws. Never logs bot tokens or chat credentials.
 */
export const telegramService = {
  isConfigured(kind: TelegramBotKind): boolean {
    return botConfig(kind) !== null
  },

  async send(kind: TelegramBotKind, text: string): Promise<{ sent: boolean; skipped: boolean }> {
    const cfg = botConfig(kind)
    if (!cfg) {
      logger.debug({ kind }, 'Telegram bot not configured; skipping')
      return { sent: false, skipped: true }
    }

    try {
      const url = `https://api.telegram.org/bot${cfg.token}/sendMessage`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cfg.chatId,
          text: text.slice(0, 4000),
          disable_web_page_preview: true,
        }),
      })
      if (!response.ok) {
        // Do not include response body if it might echo the token in rare API errors.
        logger.warn(
          { kind, status: response.status },
          'Telegram sendMessage failed',
        )
        return { sent: false, skipped: false }
      }
      return { sent: true, skipped: false }
    } catch (err) {
      logger.warn(
        { kind, err: err instanceof Error ? err.message : 'telegram_error' },
        'Telegram sendMessage threw',
      )
      return { sent: false, skipped: false }
    }
  },
}
