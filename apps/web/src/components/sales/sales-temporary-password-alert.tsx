'use client'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

export function SalesTemporaryPasswordAlert({
  password,
  onDismiss,
}: {
  password: string
  onDismiss: () => void
}) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <Alert tone="warning" title="One-time password — copy it now">
      <p className="text-caption text-fg-muted">
        This password is shown once and is not stored in plaintext. Share it with the salesman over
        a private channel, then ask them to sign in at the Sales Portal.
      </p>
      <p className="mt-3 break-all font-mono text-body-sm text-fg">{password}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void copy(password)}>
          {copied ? 'Copied' : 'Copy password'}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDismiss}>
          I have saved it
        </Button>
      </div>
    </Alert>
  )
}
