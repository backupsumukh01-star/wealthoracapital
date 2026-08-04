'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { motion, animate } from 'framer-motion'
import { useEffect, useState } from 'react'

import { GlowPanel } from '@/components/dashboard/glow-panel'
import { LiveReturnBadge } from '@/components/dashboard/live-return-badge'
import { Money } from '@/components/common/money'
import { AnimatedNumber } from '@/components/motion/animated-number'
import { Button } from '@/components/ui/button'
import { useLiveDrift } from '@/hooks/use-live-drift'
import { DEMO_PROFILE, DEMO_WALLET, MONTHLY_PROFIT } from '@/lib/dashboard-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { useInvestorLifecycle } from '@/providers/investor-lifecycle-provider'
import { cn } from '@/lib/cn'

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function LivePortfolioBalance({ base }: { base: string }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const target = Number(base)
  const [seeded, setSeeded] = useState(prefersReducedMotion)
  const [boot, setBoot] = useState(prefersReducedMotion ? target : 0)
  const live = useLiveDrift(target, {
    intervalMs: 3200,
    maxDelta: 0.38,
    decimals: 2,
    startAfterMs: 200,
    enabled: seeded && !prefersReducedMotion,
  })

  useEffect(() => {
    if (prefersReducedMotion) {
      setBoot(target)
      setSeeded(true)
      return
    }
    const controls = animate(0, target, {
      duration: 1.15,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setBoot,
      onComplete: () => setSeeded(true),
    })
    return () => controls.stop()
  }, [prefersReducedMotion, target])

  if (!seeded) {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(boot)
    return (
      <span data-numeric className="tabular-nums text-inherit">
        <span aria-hidden>${formatted}</span>
        <span className="sr-only">${target.toFixed(2)}</span>
      </span>
    )
  }

  return (
    <AnimatedNumber value={live} prefix="$" decimals={2} duration={0.75} className="text-inherit" />
  )
}

/** Above-the-fold portfolio hero — the number is the product. */
export function PortfolioHero({
  onDeposit,
  onWithdraw,
}: {
  onDeposit?: () => void
  onWithdraw?: () => void
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const hour = new Date().getHours()
  const greeting = greetingForHour(hour)

  const { session, canDeposit, accountStatus } = useInvestorLifecycle()
  const wallet = session?.wallet
  const balance = wallet?.availableBalance ?? DEMO_WALLET.balance
  const todayProfit = wallet?.todayProfit ?? DEMO_WALLET.todayProfit
  const totalProfit = wallet?.totalProfit ?? DEMO_WALLET.totalProfit
  const invested = wallet?.investedAmount ?? DEMO_WALLET.investedAmount
  const available = wallet?.availableBalance ?? DEMO_WALLET.availableBalance
  const pendingDep = wallet?.pendingDeposit ?? DEMO_WALLET.pendingDeposit
  const pendingWdr = wallet?.pendingWithdrawal ?? DEMO_WALLET.pendingWithdrawal
  const name = session
    ? `${session.firstName}`
    : DEMO_PROFILE.firstName

  const depositBtn = onDeposit ? (
    <Button
      size="lg"
      className="w-full flex-1 shadow-glow sm:min-w-[160px]"
      onClick={onDeposit}
    >
      {canDeposit ? (
        <>
          <ArrowDownToLine aria-hidden />
          Deposit
        </>
      ) : (
        accountStatus.nextActionLabel
      )}
    </Button>
  ) : (
    <Button asChild size="lg" className="w-full flex-1 shadow-glow sm:min-w-[160px]">
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
      className="w-full flex-1 sm:min-w-[160px]"
      onClick={onWithdraw}
    >
      <ArrowUpFromLine aria-hidden />
      Withdraw
    </Button>
  ) : (
    <Button asChild size="lg" variant="secondary" className="w-full flex-1 sm:min-w-[160px]">
      <Link href={`${ROUTES.dashboard.wallet}?action=withdraw`}>
        <ArrowUpFromLine aria-hidden />
        Withdraw
      </Link>
    </Button>
  )

  return (
    <GlowPanel className="lg:col-span-2">
      <div className="flex flex-col gap-6">
        <div>
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
          <h1 className="mt-1 text-heading-lg text-fg sm:text-heading-xl">
            Welcome back to{' '}
            <span className="bg-gradient-to-r from-[#5EF2C4] via-[#12D6A0] to-[#2AE8FF] bg-clip-text text-transparent">
              Growzy
            </span>
          </h1>
          <p className="mt-1.5 text-caption text-fg-subtle">
            Your capital is under active desk management.
          </p>
        </div>

        <div>
          <p className="text-overline text-accent-300">Total portfolio</p>
          <p className="mt-2 text-stat-xl tracking-tight text-fg sm:text-[3.25rem]">
            <LivePortfolioBalance base={balance} />
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <LiveReturnBadge basePct={DEMO_WALLET.todayReturnPct} />
            <span className="text-caption text-fg-subtle">
              Month <Money value={MONTHLY_PROFIT} signed size="sm" className="text-fg-muted" />
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Today’s profit', value: todayProfit, tone: 'profit' as const },
            { label: 'Monthly profit', value: MONTHLY_PROFIT, tone: 'profit' as const },
            { label: 'Total profit', value: totalProfit, tone: 'profit' as const },
            { label: 'Total investment', value: invested, tone: 'neutral' as const },
            { label: 'Available', value: available, tone: 'neutral' as const },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/5 bg-inset/40 px-3 py-3 transition-transform duration-200 hover:-translate-y-0.5 sm:px-3.5"
            >
              <p className="text-[11px] text-fg-subtle">{stat.label}</p>
              <p
                className={cn(
                  'mt-1 text-body-sm font-semibold tabular-nums sm:text-body',
                  stat.tone === 'profit' ? 'text-profit' : 'text-fg',
                )}
              >
                <Money value={stat.value} signed={stat.tone === 'profit'} size="sm" />
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-caption text-fg-subtle sm:flex sm:gap-6">
          <p>
            Pending deposit{' '}
            <Money value={pendingDep as typeof DEMO_WALLET.pendingDeposit} size="sm" className="text-warning" />
          </p>
          <p>
            Pending withdrawal{' '}
            <Money value={pendingWdr as typeof DEMO_WALLET.pendingWithdrawal} size="sm" className="text-warning" />
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {depositBtn}
          {withdrawBtn}
        </div>
      </div>
    </GlowPanel>
  )
}
