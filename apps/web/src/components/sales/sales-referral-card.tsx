'use client'

import { Check, Copy } from 'lucide-react'
import { salesReferralUrl } from '@meridian/shared'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { env } from '@/lib/env'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

export function SalesReferralCard({
  code,
  link,
}: {
  code: string
  /** Canonical register URL from the Sales API when available. */
  link?: string
}) {
  const resolvedLink = (link && link.trim()) || salesReferralUrl(env.NEXT_PUBLIC_SITE_URL, code)
  const { copied: copiedLink, copy: copyLink } = useCopyToClipboard()
  const { copied: copiedCode, copy: copyCode } = useCopyToClipboard()

  return (
    <Card padded="lg" variant="glass" className="min-w-0 space-y-4">
      <div>
        <p className="text-caption text-fg-subtle">Your Sales Link</p>
        <p className="mt-2 break-all text-body-sm text-fg">{resolvedLink}</p>
      </div>
      <p className="text-caption text-fg-muted">
        Code <span className="font-medium text-fg">{code}</span> is assigned by the platform and
        cannot be edited here.
      </p>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => void copyLink(resolvedLink)}>
          {copiedLink ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copiedLink ? 'Link copied' : 'Copy link'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void copyCode(code)}>
          {copiedCode ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copiedCode ? 'Code copied' : 'Copy code'}
        </Button>
      </div>
    </Card>
  )
}
