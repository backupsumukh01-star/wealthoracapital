import { cookies } from 'next/headers'

import { COOKIES } from '@/config/cookies.config'
import type { Session } from '@/providers/session-provider'

/**
 * Server-side session read for layouts / RSC.
 * Scaffold: returns null until `authService.me` is wired from the server.
 * Never decode JWTs locally — forward cookies to the API.
 */
export async function getServerSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  if (!cookieStore.has(COOKIES.investorAccess)) return null
  return null
}

/** Presence only — not verification. */
export async function hasSessionCookie(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.has(COOKIES.investorAccess)
}

/** @deprecated Admin and investor sessions share the same `mfx_at` cookie — use `hasSessionCookie`. */
export async function hasAdminSessionCookie(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.has(COOKIES.investorAccess)
}
