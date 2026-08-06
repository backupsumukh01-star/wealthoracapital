'use client'

import { useEffect, useState } from 'react'

import { Alert } from '@/components/ui/alert'

/** Lightweight offline / reconnect banner for dashboard stability. */
export function NetworkStatusBanner() {
  const [online, setOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    function sync() {
      const next = navigator.onLine
      setOnline((prev) => {
        if (!prev && next) setWasOffline(true)
        return next
      })
    }
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  useEffect(() => {
    if (!wasOffline || !online) return
    const id = window.setTimeout(() => setWasOffline(false), 4_000)
    return () => window.clearTimeout(id)
  }, [wasOffline, online])

  if (!online) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center p-3">
        <div className="pointer-events-auto w-full max-w-lg">
          <Alert tone="danger" title="You are offline">
            Changes will sync automatically when your connection returns.
          </Alert>
        </div>
      </div>
    )
  }

  if (wasOffline) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center p-3">
        <div className="pointer-events-auto w-full max-w-lg">
          <Alert tone="success" title="Back online">
            Reconnected — refreshing live data.
          </Alert>
        </div>
      </div>
    )
  }

  return null
}
