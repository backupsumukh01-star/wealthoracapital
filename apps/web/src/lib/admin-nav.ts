'use client'

/** Persist list scroll/filters across Admin detail navigations (Back must restore). */

const FROM_KEY = 'admin:nav:from'

export function rememberAdminListLocation(pathnameWithSearch?: string) {
  if (typeof window === 'undefined') return
  const value =
    pathnameWithSearch ?? `${window.location.pathname}${window.location.search}`
  if (value.startsWith('/admin')) {
    sessionStorage.setItem(FROM_KEY, value)
  }
}

export function peekAdminListLocation(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const value = sessionStorage.getItem(FROM_KEY)
    return value?.startsWith('/admin') ? value : null
  } catch {
    return null
  }
}

export function saveAdminViewState(key: string, state: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ ...state, scrollY: window.scrollY }),
    )
  } catch {
    // private mode / quota
  }
}

export function loadAdminViewState<T extends Record<string, unknown>>(
  key: string,
): (T & { scrollY?: number }) | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T & { scrollY?: number }
  } catch {
    return null
  }
}

export function restoreAdminScroll(scrollY: number | undefined) {
  if (typeof window === 'undefined' || scrollY == null || Number.isNaN(scrollY)) return
  requestAnimationFrame(() => {
    window.scrollTo(0, scrollY)
  })
}
