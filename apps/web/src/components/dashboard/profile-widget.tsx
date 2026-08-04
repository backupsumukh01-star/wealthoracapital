'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'

import { StatusBadge } from '@/components/common/status-badge'
import { SectionHeader } from '@/components/common/page-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DEMO_PROFILE } from '@/lib/dashboard-data'
import { formatDate, initialsOf } from '@/lib/format'

export function ProfileWidget() {
  const fullName = `${DEMO_PROFILE.firstName} ${DEMO_PROFILE.lastName}`

  return (
    <Card variant="glass" padded="md" className="h-full">
      <SectionHeader title="Profile" description="Your account at a glance." as="h3" />

      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarImage src={DEMO_PROFILE.avatarUrl ?? undefined} alt="" />
          <AvatarFallback>
            {initialsOf(DEMO_PROFILE.firstName, DEMO_PROFILE.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-heading-sm text-fg">{fullName}</p>
          <p className="truncate text-caption text-fg-subtle">{DEMO_PROFILE.email}</p>
        </div>
      </div>

      <dl className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body-sm text-fg-muted">Member since</dt>
          <dd className="text-body-sm text-fg">{formatDate(DEMO_PROFILE.memberSince)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body-sm text-fg-muted">Investment plan</dt>
          <dd className="text-body-sm font-medium text-fg">{DEMO_PROFILE.plan}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body-sm text-fg-muted">Verification</dt>
          <dd>
            <StatusBadge status="VERIFIED" />
          </dd>
        </div>
      </dl>

      <Button asChild variant="secondary" size="sm" className="mt-5 w-full">
        <Link href={ROUTES.dashboard.settings.profile}>Manage profile</Link>
      </Button>
    </Card>
  )
}
