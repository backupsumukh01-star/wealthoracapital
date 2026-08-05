'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { Sparkles } from 'lucide-react'

import { Money } from '@/components/common/money'
import { SectionHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CopyButton } from '@/components/ui/copy-button'
import { useSession } from '@/providers/session-provider'

export function ReferralWidget() {
  const { session } = useSession()
  const code = session?.user.id ? session.user.id.slice(0, 8).toUpperCase() : '—'
  const link = session ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${code}` : ''

  return (
    <Card variant="accent" padded="md" className="h-full">
      <SectionHeader
        title="Invite friends"
        description="Share Growzy and earn when they fund."
        as="h3"
      />

      <div className="mb-4 flex items-center gap-2 text-accent-200">
        <Sparkles className="size-4" aria-hidden />
        <span className="text-caption">Referral programme</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-line bg-inset/40 px-3 py-3 text-center">
          <p className="text-stat-md text-fg">0</p>
          <p className="text-caption text-fg-subtle">Invited</p>
        </div>
        <div className="rounded-xl border border-line bg-inset/40 px-3 py-3 text-center">
          <p className="text-stat-md text-fg">0</p>
          <p className="text-caption text-fg-subtle">Funded</p>
        </div>
        <div className="rounded-xl border border-line bg-inset/40 px-3 py-3 text-center">
          <Money value="0.00" className="text-stat-md text-profit" />
          <p className="text-caption text-fg-subtle">Earned</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-inset/50 p-3">
        <p className="text-caption text-fg-subtle">Your link</p>
        <div className="mt-1.5 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate font-mono text-caption text-fg">
            {link || 'Sign in to get your referral link'}
          </code>
          <CopyButton value={link} label="Referral link" />
        </div>
        <p className="mt-2 text-caption text-fg-subtle">
          Code <span className="font-mono text-fg">{code}</span>
        </p>
      </div>

      <Button asChild size="sm" className="mt-4 w-full">
        <Link href={ROUTES.dashboard.referrals}>Open referrals</Link>
      </Button>
    </Card>
  )
}
