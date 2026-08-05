'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { BadgeCheck, Shield } from 'lucide-react'

import { InvestorAvatar } from '@/components/dashboard/investor-avatar'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { useSession } from '@/providers/session-provider'

export function PremiumProfileCard() {
  const { session } = useSession()
  const firstName = session?.user.firstName ?? 'Investor'
  const lastName = session?.user.lastName ?? ''
  const kycApproved = session?.user.kycStatus === 'APPROVED'

  return (
    <div className="glass glass-edge card-lift noise-overlay relative overflow-hidden rounded-3xl p-5 shadow-e2">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-accent-500/20 blur-2xl"
      />
      <div className="relative flex items-start gap-4">
        <InvestorAvatar
          firstName={firstName}
          lastName={lastName}
          src={session?.user.avatarUrl ?? null}
          size="lg"
          verified={kycApproved}
          online
        />
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-fg">
            {firstName} {lastName}
          </p>
          <p className="truncate text-caption text-fg-subtle">{session?.user.email ?? 'Not signed in'}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-profit/30 bg-profit/10 px-2 py-0.5 text-[11px] text-profit">
              <BadgeCheck className="size-3" aria-hidden />
              {kycApproved ? 'Verified' : 'Unverified'}
            </span>
          </div>
        </div>
      </div>

      <dl className="relative mt-5 space-y-2.5 border-t border-line/70 pt-4 text-caption">
        <div className="flex justify-between gap-3">
          <dt className="text-fg-subtle">Member since</dt>
          <dd className="text-fg-muted">
            {session?.user.createdAt ? formatDate(session.user.createdAt) : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-fg-subtle">Security</dt>
          <dd className="inline-flex items-center gap-1 text-fg-muted">
            <Shield className="size-3" aria-hidden />
            Account secured
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-fg-subtle">KYC</dt>
          <dd className={kycApproved ? 'text-profit' : 'text-fg-muted'}>
            {session?.user.kycStatus ?? 'NOT_STARTED'}
          </dd>
        </div>
      </dl>

      <Button asChild variant="secondary" className="relative mt-4 w-full">
        <Link href={ROUTES.dashboard.settings.profile}>Manage profile</Link>
      </Button>
    </div>
  )
}
