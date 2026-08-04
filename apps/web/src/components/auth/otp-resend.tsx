'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

/** Resend OTP control with countdown. Demo-only — wire to API later. */
export function OtpResend({
  seconds = 60,
  onResend,
  className,
}: {
  seconds?: number
  onResend: () => void | Promise<void>
  className?: string
}) {
  const [left, setLeft] = useState(seconds)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (left <= 0) return
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [left])

  async function handleResend() {
    setBusy(true)
    try {
      await onResend()
      setLeft(seconds)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('text-center text-body-sm text-fg-muted', className)}>
      {left > 0 ? (
        <p>
          Resend code in{' '}
          <span className="tabular-nums text-fg" aria-live="polite">
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </span>
        </p>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          loading={busy}
          onClick={() => void handleResend()}
        >
          Resend OTP
        </Button>
      )}
    </div>
  )
}
