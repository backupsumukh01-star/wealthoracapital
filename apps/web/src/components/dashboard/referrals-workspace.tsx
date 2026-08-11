'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import {
  Copy,
  Lock,
  Share2,
  Sparkles,
  ArrowDownToLine,
} from 'lucide-react'

import { Money } from '@/components/common/money'
import { PageHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/dashboard/status-pill'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import {
  useRedeemReferralReward,
  useReferralRewards,
  useReferralSummary,
} from '@/features/referrals/hooks'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime, formatPercent } from '@/lib/format'
import type { ReferralRewardItem } from '@/services/referral.service'

const SHARE_TEXT = 'Join me on Growzy Capital and start your investment journey.'

function redeemErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isAuthError || error.status === 401) {
      return 'Your session has expired. Please sign in again.'
    }
    if (error.status === 403) {
      return error.message || 'You cannot redeem this reward.'
    }
    return error.message || 'Could not redeem referral reward.'
  }
  if (error instanceof Error) return error.message
  return 'Could not redeem referral reward. Please try again.'
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'default' | 'locked' | 'available' | 'redeemed'
}) {
  const valueClass =
    tone === 'locked'
      ? 'text-warning'
      : tone === 'available'
        ? 'text-profit'
        : tone === 'redeemed'
          ? 'text-info'
          : 'text-fg'

  return (
    <div className="min-w-0 rounded-xl border border-line bg-inset/40 px-3 py-3 sm:px-4 sm:py-3.5">
      <p className="text-caption text-fg-subtle">{label}</p>
      <Money value={value} size="md" className={cn('mt-1 block break-all', valueClass)} />
    </div>
  )
}

function ShareControls({
  code,
  link,
}: {
  code: string
  link: string
}) {
  const [sharing, setSharing] = useState(false)

  async function onCopyCode() {
    const ok = await copyText(code)
    if (ok) toast.success('Referral code copied')
    else toast.error('Could not copy code')
  }

  async function onCopyLink() {
    const ok = await copyText(link)
    if (ok) toast.success('Referral link copied')
    else toast.error('Could not copy link')
  }

  async function onShare() {
    setSharing(true)
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: 'Growzy Capital',
            text: SHARE_TEXT,
            url: link,
          })
          return
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
        }
      }
      const ok = await copyText(link)
      if (ok) toast.success('Referral link copied')
      else toast.error('Could not share or copy link')
    } finally {
      setSharing(false)
    }
  }

  return (
    <Card padded="md" className="space-y-4">
      <div>
        <p className="text-caption text-fg-subtle">Referral code</p>
        <code className="mt-1.5 block min-w-0 truncate rounded-lg border border-line bg-inset/50 px-3 py-2.5 font-mono text-body-sm text-fg">
          {code}
        </code>
      </div>

      <div>
        <p className="text-caption text-fg-subtle">Referral link</p>
        <code className="mt-1.5 block min-w-0 break-all rounded-lg border border-line bg-inset/50 px-3 py-2.5 font-mono text-[12px] leading-snug text-fg">
          {link}
        </code>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button type="button" variant="secondary" size="sm" fullWidth onClick={() => void onCopyCode()}>
          <Copy aria-hidden />
          Copy Code
        </Button>
        <Button type="button" variant="secondary" size="sm" fullWidth onClick={() => void onCopyLink()}>
          <Copy aria-hidden />
          Copy Link
        </Button>
        <Button
          type="button"
          size="sm"
          fullWidth
          loading={sharing}
          loadingText="Sharing"
          onClick={() => void onShare()}
        >
          <Share2 aria-hidden />
          Share
        </Button>
      </div>
    </Card>
  )
}

function RewardAction({ reward }: { reward: ReferralRewardItem }) {
  const redeem = useRedeemReferralReward()
  const [busyId, setBusyId] = useState<string | null>(null)

  if (reward.status === 'LOCKED') {
    return (
      <Button type="button" size="sm" variant="secondary" disabled fullWidth className="sm:w-auto">
        Available on {formatDate(reward.unlockAt)}
      </Button>
    )
  }

  if (reward.status === 'REDEEMED') {
    return (
      <Button type="button" size="sm" variant="ghost" disabled fullWidth className="sm:w-auto">
        Redeemed
      </Button>
    )
  }

  if (reward.status === 'CANCELLED') {
    return (
      <Button type="button" size="sm" variant="ghost" disabled fullWidth className="sm:w-auto">
        Cancelled
      </Button>
    )
  }

  async function onRedeem() {
    setBusyId(reward.id)
    try {
      const result = await redeem.mutateAsync(reward.id)
      if (result.alreadyRedeemed) {
        toast.info('This reward was already redeemed.')
      } else {
        toast.success('Referral reward redeemed successfully.')
      }
    } catch (error) {
      toast.error(redeemErrorMessage(error))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      fullWidth
      className="sm:w-auto"
      loading={busyId === reward.id}
      loadingText="Redeeming"
      onClick={() => void onRedeem()}
    >
      Redeem
    </Button>
  )
}

function RewardCard({ reward }: { reward: ReferralRewardItem }) {
  return (
    <li className="rounded-xl border border-line bg-raised/40 p-3.5 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-caption text-fg-subtle">{formatDateTime(reward.createdAt)}</p>
          <p className="mt-1 text-body-sm font-medium text-fg">
            Reward <Money value={reward.rewardAmount} size="sm" className="inline text-profit" />
          </p>
        </div>
        <StatusPill status={reward.status} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-caption">
        <div className="min-w-0">
          <dt className="text-fg-subtle">Referred deposit</dt>
          <dd className="mt-0.5 text-fg">
            <Money value={reward.sourceAmount} size="sm" />
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-fg-subtle">Referral %</dt>
          <dd className="mt-0.5 text-fg">
            {formatPercent(reward.percentApplied, { signed: false, decimals: 2 })}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-fg-subtle">Unlock date</dt>
          <dd className="mt-0.5 text-fg">{formatDate(reward.unlockAt)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-fg-subtle">Redeemed</dt>
          <dd className="mt-0.5 text-fg">
            {reward.redeemedAt ? formatDate(reward.redeemedAt) : '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-3">
        <RewardAction reward={reward} />
      </div>
    </li>
  )
}

function RewardTable({ items }: { items: ReferralRewardItem[] }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[720px] border-collapse text-left text-body-sm">
        <thead>
          <tr className="border-b border-line text-caption text-fg-subtle">
            <th className="px-3 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Deposit</th>
            <th className="px-3 py-2.5 font-medium">%</th>
            <th className="px-3 py-2.5 font-medium">Reward</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Unlock</th>
            <th className="px-3 py-2.5 font-medium">Redeemed</th>
            <th className="px-3 py-2.5 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((reward) => (
            <tr key={reward.id} className="border-b border-line/70 align-top">
              <td className="px-3 py-3 text-fg-muted">{formatDateTime(reward.createdAt)}</td>
              <td className="px-3 py-3">
                <Money value={reward.sourceAmount} size="sm" />
              </td>
              <td className="px-3 py-3 text-fg-muted">
                {formatPercent(reward.percentApplied, { signed: false, decimals: 2 })}
              </td>
              <td className="px-3 py-3">
                <Money value={reward.rewardAmount} size="sm" className="text-profit" />
              </td>
              <td className="px-3 py-3">
                <StatusPill status={reward.status} />
              </td>
              <td className="px-3 py-3 text-fg-muted">{formatDate(reward.unlockAt)}</td>
              <td className="px-3 py-3 text-fg-muted">
                {reward.redeemedAt ? formatDate(reward.redeemedAt) : '—'}
              </td>
              <td className="px-3 py-3">
                <RewardAction reward={reward} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ReferralsWorkspace() {
  const summaryQuery = useReferralSummary()
  const rewardsQuery = useReferralRewards(
    { limit: 50 },
    { enabled: Boolean(summaryQuery.data?.referralEligible) },
  )

  const summary = summaryQuery.data
  const loading = summaryQuery.isLoading
  const error = summaryQuery.error

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Referrals" description="Invite friends and track referral rewards." />
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="space-y-6">
        <PageHeader title="Referrals" description="Invite friends and track referral rewards." />
        <Alert tone="danger" title="Could not load referrals">
          {error instanceof ApiError && (error.isAuthError || error.status === 401)
            ? 'Your session has expired. Please sign in again.'
            : error instanceof Error
              ? error.message
              : 'Please refresh and try again.'}
        </Alert>
      </div>
    )
  }

  if (!summary.referralEligible) {
    return (
      <div className="space-y-6">
        <PageHeader title="Referrals" description="Invite friends and track referral rewards." />
        <Card className="overflow-hidden p-0">
          <div className="relative px-5 py-10 text-center sm:px-8 sm:py-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(var(--accent-500)/0.12),transparent_55%)]"
            />
            <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
              <span className="grid size-14 place-items-center rounded-2xl border border-line bg-inset/60 text-accent-300">
                <Lock className="size-6" aria-hidden />
              </span>
              <div className="space-y-2">
                <h2 className="text-title-sm text-fg">Referrals locked</h2>
                <p className="text-body-sm text-fg-muted">
                  Referral program unlocks after your first approved deposit.
                </p>
              </div>
              <Button asChild size="sm">
                <Link href={ROUTES.dashboard.deposit}>
                  <ArrowDownToLine aria-hidden />
                  Make a deposit
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const rewards = rewardsQuery.data?.items ?? []

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Referrals"
        description="Share your link. Rewards stay in your referral balance until you redeem them."
      />

      {!summary.referralEnabled ? (
        <Alert tone="warning" title="Referral rewards are paused">
          Sharing still works for development and testing. New rewards are not created while the
          programme flag is off.
        </Alert>
      ) : null}

      <section aria-labelledby="referral-summary-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-accent-300" aria-hidden />
          <h2 id="referral-summary-heading" className="text-body-sm font-medium text-fg">
            Referral balance
          </h2>
        </div>
        <p className="text-caption text-fg-subtle">
          Separate from your investment wallet. Redeem moves available rewards into investment.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <SummaryStat label="Total referral earned" value={summary.totalReferralEarned} />
          <SummaryStat label="Locked referral" value={summary.lockedReferral} tone="locked" />
          <SummaryStat label="Available referral" value={summary.availableReferral} tone="available" />
          <SummaryStat label="Redeemed referral" value={summary.redeemedReferral} tone="redeemed" />
        </div>
      </section>

      {summary.referralCode && summary.referralLink ? (
        <section aria-labelledby="referral-share-heading" className="space-y-3">
          <h2 id="referral-share-heading" className="text-body-sm font-medium text-fg">
            Your referral link
          </h2>
          <ShareControls code={summary.referralCode} link={summary.referralLink} />
          <p className="text-caption text-fg-subtle">
            Programme rate{' '}
            {formatPercent(summary.referralPercent, { signed: false, decimals: 2 })} · unlocks after{' '}
            {summary.referralUnlockDays} days
          </p>
        </section>
      ) : null}

      <section aria-labelledby="referral-history-heading" className="space-y-3">
        <h2 id="referral-history-heading" className="text-body-sm font-medium text-fg">
          Reward history
        </h2>
        <Card padded="none" className="overflow-hidden">
          {rewardsQuery.isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : rewardsQuery.error ? (
            <div className="p-4">
              <Alert tone="danger" title="Could not load reward history">
                {rewardsQuery.error instanceof Error
                  ? rewardsQuery.error.message
                  : 'Please refresh and try again.'}
              </Alert>
            </div>
          ) : rewards.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Sparkles}
                title="No referral rewards yet"
                description="When someone you referred funds an approved deposit, rewards appear here."
              />
            </div>
          ) : (
            <>
              <ul className="space-y-3 p-3 md:hidden">
                {rewards.map((reward) => (
                  <RewardCard key={reward.id} reward={reward} />
                ))}
              </ul>
              <div className="p-2">
                <RewardTable items={rewards} />
              </div>
            </>
          )}
        </Card>
      </section>
    </div>
  )
}
