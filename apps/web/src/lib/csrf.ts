/** Read the non-httpOnly double-submit CSRF cookie set by the API. */
export function readCsrfCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(/(?:^|; )mfx_csrf=([^;]*)/)
  const value = match?.[1]
  return value ? decodeURIComponent(value) : undefined
}

export function csrfHeaders(): Record<string, string> {
  const token = readCsrfCookie()
  return token ? { 'X-CSRF-Token': token } : {}
}
