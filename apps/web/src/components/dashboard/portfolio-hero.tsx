'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { motion } from 'framer-motion'

import { GlowPanel } from '@/components/dashboard/glow-panel'
import { Money } from '@/components/common/money'
import { Percent } from '@/components/common/percent'
import { AnimatedNumber } from '@/components/motion/animated-number'
import { Button } from '@/components/ui/button'
import { useReferralSummary } from '@/features/referrals/hooks'
import { useWalletSummary } from '@/features/wallet/hooks'
import { useDisplayCurrency } from '@/hooks/use-display-currency'
import { useExchangeRate } from '@/hooks/use-exchange-rate'
import { canTransact } from '@/lib/account-access'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function hasMeaningfulAmount(value: string | undefined | null) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) && Math.abs(n) > 0.000_001
}

/** Above-the-fold portfolio hero — balances from GET /wallet/summary (+ referral summary). */
export function PortfolioHero({
  onDeposit,
  onWithdraw,
}: {
  onDeposit?: () => void
  onWithdraw?: () => void
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [greeting, setGreeting] = useState('Welcome')
  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()))
  }, [])
  const { session } = useSession()
  const { data: summary } = useWalletSummary({
    enabled: Boolean(session),
    refetchInterval: 15_000,
  })
  const { data: referral } = useReferralSummary({
    enabled: Boolean(session),
  })
  const { convertFromUsd, rates } = useExchangeRate({ enabled: Boolean(session) })
  const { displayCurrency } = useDisplayCurrency({ enabled: Boolean(session) })

  const wallet = summary?.wallet ?? session?.wallet
  const portfolio = wallet?.availableBalance ?? '0.00'
  const locked = wallet?.lockedBalance ?? '0.00'
  const todayProfit = summary?.today.profit ?? '0.00'
  const todayReturnPct = summary?.today.returnPct ?? '0.00'
  const totalDeposit = wallet?.totalDeposited ?? '0.00'
  const totalWithdrawal = wallet?.totalWithdrawn ?? '0.00'
  const totalProfit = wallet?.totalProfit ?? '0.00'
  const referralEarnings = referral?.totalReferralEarned ?? '0.00'
  const pendingDep = summary?.pending?.depositAmount ?? '0.00'
  const pendingWdr = summary?.pending?.withdrawalAmount ?? '0.00'
  const pendingDepCount = summary?.pending?.deposits ?? 0
  const pendingWdrCount = summary?.pending?.withdrawals ?? 0
  const name = session?.user.firstName ?? 'Investor'
  const allowed = canTransact(session?.user.kycStatus)
  const portfolioDisplay =
    displayCurrency === 'USD' ? null : convertFromUsd(portfolio, displayCurrency)
  const displayRate = rates[displayCurrency]
  const todayUp = Number(todayProfit) >= 0
  const pendingActive = hasMeaningfulAmount(pendingDep) || hasMeaningfulAmount(pendingWdr)

  const depositBtn = onDeposit ? (
    <Button size="lg" className="h-12 w-full flex-1 shadow-glow sm:min-w-[160px]" onClick={onDeposit}>
      {allowed ? (
        <>
          <ArrowDownToLine aria-hidden />
          Deposit
        </>
      ) : (
        <>
          <ArrowDownToLine aria-hidden />
          Deposit locked
        </>
      )}
    </Button>
  ) : (
    <Button asChild size="lg" className="h-12 w-full flex-1 shadow-glow sm:min-w-[160px]">
      <Link href={`${ROUTES.dashboard.wallet}?action=deposit`}>
        <ArrowDownToLine aria-hidden />
        Deposit
      </Link>
    </Button>
  )

  const withdrawBtn = onWithdraw ? (
    <Button
      size="lg"
      variant="secondary"
      className="h-12 w-full flex-1 sm:min-w-[160px]"
      onClick={onWithdraw}
    >
      <ArrowUpFromLine aria-hidden />
      Withdraw
    </Button>
  ) : (
    <Button asChild size="lg" variant="secondary" className="h-12 w-full flex-1 sm:min-w-[160px]">
      <Link href={`${ROUTES.dashboard.wallet}?action=withdraw`}>
        <ArrowUpFromLine aria-hidden />
        Withdraw
      </Link>
    </Button>
  )

  const journey = [
    {
      label: 'Total Deposit',
      value: totalDeposit,
      hint: 'Total amount deposited till date',
      tone: 'neutral' as const,
    },
    {
      label: 'Total Withdrawal',
      value: totalWithdrawal,
      hint: 'Total amount withdrawn till date',
      tone: 'neutral' as const,
    },
    {
      label: 'Total Profit',
      value: totalProfit,
      hint: 'Profit earned from trading activities',
      tone: 'profit' as const,
    },
    {
      label: 'Referral Earnings',
      value: referralEarnings,
      hint: 'Total referral earnings',
      tone: 'profit' as const,
    },
  ]

  return (
    <GlowPanel className="lg:col-span-2">
      <div className="flex flex-col gap-6 sm:gap-7">
        <header>
          <motion.p
            className="text-body-sm text-fg-muted sm:text-body"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {greeting},{' '}
            <span className="font-medium text-fg">{name}</span>{' '}
            <span aria-hidden>👋</span>
          </motion.p>
          <p className="mt-1 text-caption text-fg-subtle sm:text-body-sm">
            Your investment overview and performance today.
          </p>
        </header>

        <section aria-labelledby="total-portfolio-heading" className="min-w-0">
          <h2 id="total-portfolio-heading" className="text-overline text-accent-300">
            Total portfolio
          </h2>
          <p className="mt-2 text-stat-xl tracking-tight text-fg sm:text-[3.25rem]">
            <AnimatedNumber
              value={Number(portfolio)}
              prefix="$"
              decimals={2}
              duration={prefersReducedMotion ? 0 : 0.75}
              className="text-inherit"
            />
          </p>
          <p className="mt-1 text-caption text-fg-subtle">Current portfolio value</p>
          {portfolioDisplay ? (
            <p className="mt-1 text-body-sm text-fg-muted tabular-nums">
              ≈ <Money value={portfolioDisplay} currency={displayCurrency} size="sm" />
              {displayRate ? (
                <span className="text-caption text-fg-subtle">
                  {' '}
                  · 1 USD = {displayRate} {displayCurrency}
                </span>
              ) : null}
            </p>
          ) : null}
          {hasMeaningfulAmount(locked) ? (
            <p className="mt-2 text-caption text-fg-muted">
              Available to withdraw{' '}
              <Money value={portfolio} size="sm" className="font-medium text-fg" />
              <span className="text-fg-subtle">
                {' '}
                · Locked <Money value={locked} size="sm" className="text-warning" />
              </span>
            </p>
          ) : null}

          <div className="mt-5 rounded-2xl border border-white/[0.06] bg-inset/35 px-3.5 py-3.5 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
              Today&apos;s performance
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p
                className={cn(
                  'text-heading-md tabular-nums sm:text-heading-lg',
                  todayUp ? 'text-profit' : 'text-loss',
                )}
              >
                <Money value={todayProfit} signed size="inherit" />
              </p>
              <p
                className={cn(
                  'text-body-sm font-medium tabular-nums',
                  todayUp ? 'text-profit' : 'text-loss',
                )}
              >
                <Percent value={todayReturnPct} showArrow />
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">{depositBtn}{withdrawBtn}</div>

        <section aria-labelledby="portfolio-summary-heading" className="min-w-0 space-y-3">
          <div>
            <h2 id="portfolio-summary-heading" className="text-overline text-accent-300">
              Portfolio summary
            </h2>
            <p className="mt-1 text-caption text-fg-subtle">
              Your complete investment journey at a glance.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 lg:grid-cols-4">
            {journey.map((stat) => {
              const converted =
                displayCurrency === 'USD' ? null : convertFromUsd(stat.value, displayCurrency)
              return (
                <li
                  key={stat.label}
                  className="min-w-0 rounded-2xl border border-white/[0.06] bg-inset/40 px-3.5 py-3.5 sm:px-4 sm:py-4"
                >
                  <p className="text-[11px] font-medium text-fg-subtle">{stat.label}</p>
                  <p
                    className={cn(
                      'mt-2 text-heading-sm tabular-nums sm:text-heading-md',
                      stat.tone === 'profit' ? 'text-profit' : 'text-fg',
                    )}
                  >
                    <Money
                      value={stat.value}
                      signed={stat.tone === 'profit'}
                      size="inherit"
                    />
                  </p>
                  {converted ? (
                    <p className="mt-0.5 text-[11px] tabular-nums text-fg-subtle">
                      <Money value={converted} currency={displayCurrency} size="inherit" />
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] leading-snug text-fg-subtle">{stat.hint}</p>
                </li>
              )
            })}
          </ul>
        </section>

        <section
          aria-labelledby="pending-activity-heading"
          className={cn(
            'rounded-2xl border px-3.5 py-3 sm:px-4',
            pendingActive
              ? 'border-warning/25 bg-warning/5'
              : 'border-white/[0.05] bg-transparent',
          )}
        >
          <h2 id="pending-activity-heading" className="sr-only">
            Pending activity
          </h2>
          <div className="flex flex-col gap-2 text-caption text-fg-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-1">
            <p>
              Pending deposit{' '}
              <Money
                value={pendingDep}
                size="sm"
                className={cn(
                  'font-medium',
                  hasMeaningfulAmount(pendingDep) ? 'text-warning' : 'text-fg-subtle',
                )}
              />
              {pendingDepCount > 0 ? (
                <span className="text-fg-subtle"> · {pendingDepCount}</span>
              ) : null}
            </p>
            <span className="hidden text-fg-subtle sm:inline" aria-hidden>
              ·
            </span>
            <p>
              Pending withdrawal{' '}
              <Money
                value={pendingWdr}
                size="sm"
                className={cn(
                  'font-medium',
                  hasMeaningfulAmount(pendingWdr) ? 'text-warning' : 'text-fg-subtle',
                )}
              />
              {pendingWdrCount > 0 ? (
                <span className="text-fg-subtle"> · {pendingWdrCount}</span>
              ) : null}
            </p>
          </div>
        </section>
      </div>
    </GlowPanel>
  )
}
