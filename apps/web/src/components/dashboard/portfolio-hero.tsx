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
import { useWalletSummary } from '@/features/wallet/hooks'
import { useExchangeRate } from '@/hooks/use-exchange-rate'
import { accountAccessMessage, canTransact } from '@/lib/account-access'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

/** Above-the-fold portfolio hero — balances from GET /wallet/summary. */
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
  const { usdToInr, rate } = useExchangeRate({ enabled: Boolean(session) })

  const wallet = summary?.wallet ?? session?.wallet
  const balance = wallet?.availableBalance ?? '0.00'
  const todayProfit = summary?.today.profit ?? '0.00'
  const totalProfit = wallet?.totalProfit ?? '0.00'
  const invested = wallet?.investedAmount ?? '0.00'
  const available = wallet?.availableBalance ?? '0.00'
  const pendingDep = summary?.pending?.depositAmount ?? '0.00'
  const pendingWdr = summary?.pending?.withdrawalAmount ?? wallet?.lockedBalance ?? '0.00'
  const todayReturnPct = summary?.today.returnPct ?? '0.00'
  const name = session?.user.firstName ?? 'Investor'
  const allowed = canTransact(session?.user.kycStatus)
  const access = accountAccessMessage(session?.user.kycStatus)
  const balanceInr = usdToInr(balance)

  const depositBtn = onDeposit ? (
    <Button
      size="lg"
      className="w-full flex-1 shadow-glow sm:min-w-[160px]"
      onClick={onDeposit}
    >
      {allowed ? (
        <>
          <ArrowDownToLine aria-hidden />
          Deposit
        </>
      ) : (
        access.nextActionLabel
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
            <AnimatedNumber
              value={Number(balance)}
              prefix="$"
              decimals={2}
              duration={prefersReducedMotion ? 0 : 0.75}
              className="text-inherit"
            />
          </p>
          {balanceInr ? (
            <p className="mt-1 text-body-sm text-fg-muted tabular-nums">
              ≈ <Money value={balanceInr} currency="INR" size="sm" />
              <span className="text-caption text-fg-subtle"> · 1 USD = ₹{rate}</span>
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-full border border-profit/20 bg-profit/10 px-2.5 py-1 text-caption text-profit">
              Today <Percent value={todayReturnPct} showArrow />
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: 'Today’s profit', value: todayProfit, tone: 'profit' as const },
            { label: 'Total profit', value: totalProfit, tone: 'profit' as const },
            { label: 'Total investment', value: invested, tone: 'neutral' as const },
            { label: 'Available', value: available, tone: 'neutral' as const },
          ].map((stat) => {
            const inr = usdToInr(stat.value)
            return (
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
                {inr ? (
                  <p className="mt-0.5 text-[11px] text-fg-subtle tabular-nums">
                    <Money value={inr} currency="INR" size="inherit" />
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 text-caption text-fg-subtle sm:flex sm:gap-6">
          <p>
            Pending deposit <Money value={pendingDep} size="sm" className="text-warning" />
          </p>
          <p>
            Pending withdrawal <Money value={pendingWdr} size="sm" className="text-warning" />
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
