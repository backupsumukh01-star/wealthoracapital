/**
 * Legacy onboarding flag helpers — no longer gate production routes.
 * Purges any leftover browser flag; prefer API KYC / emailVerified.
 */

const ONBOARDING_KEY = 'growzy_onboarding_complete'

function purge() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ONBOARDING_KEY)
  } catch {
    /* ignore */
  }
}

export function markOnboardingComplete() {
  purge()
}

export function markOnboardingPending() {
  purge()
}

export function isOnboardingComplete() {
  purge()
  return false
}
