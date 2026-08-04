'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { BadgeCheck, Shield } from 'lucide-react'

import { InvestorAvatar } from '@/components/dashboard/investor-avatar'
import { Button } from '@/components/ui/button'
import { DEMO_PROFILE } from '@/lib/dashboard-data'
import { formatDate } from '@/lib/format'

export function PremiumProfileCard() {
  return (
    <div className="glass glass-edge card-lift noise-overlay relative overflow-hidden rounded-3xl p-5 shadow-e2">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-accent-500/20 blur-2xl"
      />
      <div className="relative flex items-start gap-4">
        <InvestorAvatar
          firstName={DEMO_PROFILE.firstName}
          lastName={DEMO_PROFILE.lastName}
          src={DEMO_PROFILE.avatarUrl}
          size="lg"
          verified
          online
        />
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-fg">
            {DEMO_PROFILE.firstName} {DEMO_PROFILE.lastName}
          </p>
          <p className="truncate text-caption text-fg-subtle">{DEMO_PROFILE.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-profit/30 bg-profit/10 px-2 py-0.5 text-[11px] text-profit">
              <BadgeCheck className="size-3" aria-hidden />
              {DEMO_PROFILE.verificationStatus}
            </span>
            <span className="rounded-full border border-line bg-inset/50 px-2 py-0.5 text-[11px] text-fg-muted">
              {DEMO_PROFILE.plan} level
            </span>
          </div>
        </div>
      </div>

      <dl className="relative mt-5 space-y-2.5 border-t border-line/70 pt-4 text-caption">
        <div className="flex justify-between gap-3">
          <dt className="text-fg-subtle">Member since</dt>
          <dd className="text-fg-muted">{formatDate(DEMO_PROFILE.memberSince)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-fg-subtle">Security</dt>
          <dd className="inline-flex items-center gap-1 text-fg-muted">
            <Shield className="size-3" aria-hidden />
            2FA ready
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-fg-subtle">KYC</dt>
          <dd className="text-profit">Approved</dd>
        </div>
      </dl>

      <Button asChild variant="secondary" className="relative mt-4 w-full">
        <Link href={ROUTES.dashboard.settings.profile}>Manage profile</Link>
      </Button>
    </div>
  )
}
