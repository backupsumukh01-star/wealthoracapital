/**
 * Demo admin session — cookie only. Replace with real auth later.
 */
import { COOKIES } from '@/config/cookies.config'

export const ADMIN_SESSION_COOKIE = COOKIES.adminAccess

export function setAdminSession() {
  if (typeof document === 'undefined') return
  document.cookie = `${ADMIN_SESSION_COOKIE}=1; path=/; max-age=${60 * 60 * 12}; SameSite=Lax`
}

export function clearAdminSession() {
  if (typeof document === 'undefined') return
  document.cookie = `${ADMIN_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`
}

export function hasAdminSession() {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${ADMIN_SESSION_COOKIE}=`))
}
