/** Demo-only session cookie for frontend route guards (not a real JWT). */
import { COOKIES } from '@/config/cookies.config'

export const DEMO_SESSION_COOKIE = COOKIES.investorAccess

const ONBOARDING_KEY = 'growzy_onboarding_complete'
const maxAge = 60 * 60 * 24 * 7

export function setDemoSession() {
  document.cookie = `${DEMO_SESSION_COOKIE}=demo; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

export function clearDemoSession() {
  document.cookie = `${DEMO_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}

export function hasDemoSession() {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${DEMO_SESSION_COOKIE}=`))
}

export function markOnboardingComplete() {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function markOnboardingPending() {
  try {
    window.localStorage.removeItem(ONBOARDING_KEY)
  } catch {
    /* ignore */
  }
}

export function isOnboardingComplete() {
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return false
  }
}
