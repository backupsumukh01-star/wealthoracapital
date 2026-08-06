'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

/**
 * Keeps the open tab on the latest deploy without requiring a hard cache clear.
 *
 * 1. Unregisters any accidental service workers (we do not ship one; legacy SW = stale apps).
 * 2. Polls same-origin `/api/version` — when buildId changes, soft-reloads once.
 * 3. Compares API `/version` commit when available (warns on FE/API skew).
 */
export function DeployVersionGuard() {
  const bootBuildId = useRef(
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BUILD_ID ?? '' : '',
  )
  const reloading = useRef(false)
  const skewWarned = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function unregisterServiceWorkers() {
      if (!('serviceWorker' in navigator)) return
      try {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
        if (regs.length > 0 && 'caches' in window) {
          const keys = await caches.keys()
          await Promise.all(keys.map((k) => caches.delete(k)))
        }
      } catch {
        // Non-fatal — guard still polls for new HTML.
      }
    }

    async function checkWebVersion() {
      if (reloading.current || cancelled) return
      try {
        const res = await fetch(`/api/version?t=${Date.now()}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (!res.ok) return
        const body = (await res.json()) as { buildId?: string; commit?: string }
        const remote = body.buildId || body.commit || ''
        const local = bootBuildId.current
        if (local && remote && remote !== local) {
          reloading.current = true
          toast.message('New version available', {
            description: 'Refreshing to load the latest release…',
            duration: 2500,
          })
          window.setTimeout(() => {
            window.location.reload()
          }, 800)
        }
      } catch {
        // Offline — NetworkStatusBanner handles UX.
      }
    }

    async function checkApiSkew() {
      if (skewWarned.current || cancelled) return
      const apiBase = process.env.NEXT_PUBLIC_API_URL
      if (!apiBase) return
      try {
        const origin = new URL(apiBase).origin
        const res = await fetch(`${origin}/api/version?t=${Date.now()}`, {
          cache: 'no-store',
          credentials: 'omit',
        })
        if (!res.ok) return
        const payload = (await res.json()) as {
          success?: boolean
          data?: { commit?: string }
        }
        const apiCommit = payload.data?.commit?.slice(0, 12)
        const webCommit = (bootBuildId.current || process.env.NEXT_PUBLIC_GIT_COMMIT || '').slice(
          0,
          12,
        )
        if (apiCommit && webCommit && apiCommit !== webCommit && apiCommit !== 'local') {
          skewWarned.current = true
          console.warn('[deploy] Web/API commit mismatch', { webCommit, apiCommit })
        }
      } catch {
        // API unreachable — ignore.
      }
    }

    void unregisterServiceWorkers()
    void checkWebVersion()
    void checkApiSkew()

    const id = window.setInterval(() => {
      void checkWebVersion()
      void checkApiSkew()
    }, 60_000)

    const onFocus = () => {
      void checkWebVersion()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  return null
}
