'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'

import { StatusBadge } from '@/components/common/status-badge'
import { SectionHeader } from '@/components/common/page-header'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDate, initialsOf } from '@/lib/format'
import { useSession } from '@/providers/session-provider'

export function ProfileWidget() {
  const { session } = useSession()
  const firstName = session?.user.firstName ?? 'Investor'
  const lastName = session?.user.lastName ?? ''
  const fullName = `${firstName} ${lastName}`.trim()

  return (
    <Card variant="glass" padded="md" className="h-full">
      <SectionHeader title="Profile" description="Your account at a glance." as="h3" />

      <div className="flex items-center gap-4">
        <Avatar size="lg">
          <AvatarImage src={session?.user.avatarUrl ?? undefined} alt="" />
          <AvatarFallback>{initialsOf(firstName, lastName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-heading-sm text-fg">{fullName}</p>
          <p className="truncate text-caption text-fg-subtle">{session?.user.email ?? 'Not signed in'}</p>
        </div>
      </div>

      <dl className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body-sm text-fg-muted">Member since</dt>
          <dd className="text-body-sm text-fg">
            {session?.user.createdAt ? formatDate(session.user.createdAt) : '—'}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body-sm text-fg-muted">Verification</dt>
          <dd>
            <StatusBadge status={session?.user.kycStatus === 'APPROVED' ? 'VERIFIED' : 'PENDING'} />
          </dd>
        </div>
      </dl>

      <Button asChild variant="secondary" size="sm" className="mt-5 w-full">
        <Link href={ROUTES.dashboard.settings.profile}>Manage profile</Link>
      </Button>
    </Card>
  )
}
