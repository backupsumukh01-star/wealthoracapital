import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

export type TelegramBotKind = 'KYC' | 'DEPOSIT' | 'WITHDRAWAL'

type BotTarget = { token: string; chatId: string }

function parseCsv(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

/** One token + many chats, many tokens + one chat, or pair by index when both lists have more than one. */
function pairTargets(tokens: string[], chatIds: string[]): BotTarget[] {
  if (tokens.length === 0 || chatIds.length === 0) return []
  if (tokens.length === 1) {
    return chatIds.map((chatId) => ({ token: tokens[0]!, chatId }))
  }
  if (chatIds.length === 1) {
    return tokens.map((token) => ({ token, chatId: chatIds[0]! }))
  }
  const n = Math.min(tokens.length, chatIds.length)
  const targets: BotTarget[] = []
  for (let i = 0; i < n; i++) {
    targets.push({ token: tokens[i]!, chatId: chatIds[i]! })
  }
  return targets
}

const ALL_BOT_KINDS: TelegramBotKind[] = ['KYC', 'DEPOSIT', 'WITHDRAWAL']
const unconfiguredWarned = new Set<TelegramBotKind>()

function botTargets(kind: TelegramBotKind): BotTarget[] {
  const map: Record<TelegramBotKind, { token: string; chatId: string }> = {
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
  return pairTargets(parseCsv(cfg.token), parseCsv(cfg.chatId))
}

async function telegramErrorDescription(response: Response): Promise<string | undefined> {
  try {
    const json: unknown = await response.json()
    if (
      json &&
      typeof json === 'object' &&
      'description' in json &&
      typeof (json as { description: unknown }).description === 'string'
    ) {
      return (json as { description: string }).description.slice(0, 200)
    }
  } catch {
    // Ignore non-JSON Telegram error bodies.
  }
  return undefined
}

/** Escape Telegram MarkdownV2 special characters in plain text segments. */
export function escapeTelegramMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (ch) => `\\${ch}`)
}

/**
 * Admin Telegram fan-out. Never throws. Never logs bot tokens or chat credentials.
 * TELEGRAM_*_BOT_TOKEN and TELEGRAM_*_CHAT_ID may be a single value or comma-separated lists.
 */
export const telegramService = {
  isConfigured(kind: TelegramBotKind): boolean {
    return botTargets(kind).length > 0
  },

  configuredKinds(): TelegramBotKind[] {
    return ALL_BOT_KINDS.filter((kind) => botTargets(kind).length > 0)
  },

  async send(kind: TelegramBotKind, text: string): Promise<{ sent: boolean; skipped: boolean }> {
    const targets = botTargets(kind)
    if (targets.length === 0) {
      if (!unconfiguredWarned.has(kind)) {
        unconfiguredWarned.add(kind)
        logger.warn({ kind }, 'Telegram bot not configured; skipping')
      }
      return { sent: false, skipped: true }
    }

    const bodyText = text.slice(0, 4000)
    let anySent = false

    for (const target of targets) {
      try {
        const url = `https://api.telegram.org/bot${target.token}/sendMessage`
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: target.chatId,
            text: bodyText,
            disable_web_page_preview: true,
          }),
        })
        if (!response.ok) {
          logger.warn(
            { kind, status: response.status, description: await telegramErrorDescription(response) },
            'Telegram sendMessage failed',
          )
          continue
        }
        anySent = true
      } catch (err) {
        logger.warn(
          { kind, err: err instanceof Error ? err.message : 'telegram_error' },
          'Telegram sendMessage threw',
        )
      }
    }

    return { sent: anySent, skipped: false }
  },
}
