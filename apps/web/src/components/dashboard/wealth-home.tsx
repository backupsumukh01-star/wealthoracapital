'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { toast } from 'sonner'

import { AccountStatusBanner } from '@/components/dashboard/account-status-banner'
import { ActivityTimeline } from '@/components/dashboard/activity-timeline'
import { DashboardHomeSkeleton } from '@/components/dashboard/dashboard-home-skeleton'
import { InvestmentStatus } from '@/components/dashboard/investment-status'
import { LiveActivityFeed } from '@/components/dashboard/live-activity-feed'
import { LivePerformanceChart } from '@/components/dashboard/live-performance-chart'
import { MarketWidget } from '@/components/dashboard/market-widget'
import { PortfolioAllocation } from '@/components/dashboard/portfolio-allocation'
import { PortfolioHero } from '@/components/dashboard/portfolio-hero'
import { PremiumProfileCard } from '@/components/dashboard/premium-profile-card'
import { TradeCards } from '@/components/dashboard/trade-cards'
import { WalletFab } from '@/components/dashboard/wallet-fab'
import { WealthQuickActions } from '@/components/dashboard/wealth-quick-actions'
import { WelcomeSection } from '@/components/dashboard/welcome-section'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { DepositModal } from '@/components/wallet/deposit-modal'
import { WithdrawModal } from '@/components/wallet/withdraw-modal'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { accountAccessMessage, canTransact } from '@/lib/account-access'
import { useSession } from '@/providers/session-provider'
import { useAdminOs } from '@/providers/admin-os-provider'

/** Premium investor home — wealth experience, not an admin grid. */
export function WealthHome() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const router = useRouter()
  const { session } = useSession()
  const allowed = canTransact(session?.user.kycStatus)
  const access = accountAccessMessage(session?.user.kycStatus)
  const { ready, state } = useAdminOs()
  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [booting, setBooting] = useState(!prefersReducedMotion)

  useEffect(() => {
    if (prefersReducedMotion) {
      setBooting(false)
      return
    }
    const id = window.setTimeout(() => setBooting(false), 720)
    return () => window.clearTimeout(id)
  }, [prefersReducedMotion])

  function tryDeposit() {
    if (!allowed) {
      toast.message(access.label, { description: access.description })
      router.push(access.nextActionHref || ROUTES.auth.onboarding)
      return
    }
    setDepositOpen(true)
  }

  function tryWithdraw() {
    if (!allowed) {
      toast.message(access.label, { description: access.description })
      router.push(access.nextActionHref || ROUTES.auth.onboarding)
      return
    }
    setWithdrawOpen(true)
  }

  if (booting) {
    return <DashboardHomeSkeleton />
  }

  return (
    <>
      <div className="space-y-6 lg:space-y-8">
        <WelcomeSection />

        <AccountStatusBanner />

        {ready && state.platformCms.riskDisclaimer ? (
          <p className="rounded-xl border border-white/[0.06] bg-inset/40 px-4 py-3 text-caption text-fg-subtle">
            {state.platformCms.riskDisclaimer}
          </p>
        ) : null}

        <PortfolioHero onDeposit={tryDeposit} onWithdraw={tryWithdraw} />

        <RevealOnScroll y={18} amount={0.12}>
          <LivePerformanceChart />
        </RevealOnScroll>

        <RevealOnScroll y={16} delay={0.04}>
          <WealthQuickActions onDeposit={tryDeposit} onWithdraw={tryWithdraw} />
        </RevealOnScroll>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <RevealOnScroll y={20}>
            <TradeCards />
          </RevealOnScroll>
          <div className="space-y-5">
            <RevealOnScroll y={16} delay={0.05}>
              <InvestmentStatus />
            </RevealOnScroll>
            <RevealOnScroll y={16} delay={0.08}>
              <PortfolioAllocation />
            </RevealOnScroll>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr_0.9fr]">
          <RevealOnScroll y={18}>
            <MarketWidget />
          </RevealOnScroll>
          <RevealOnScroll y={18} delay={0.05}>
            <ActivityTimeline limit={5} showFilters={false} />
          </RevealOnScroll>
          <RevealOnScroll y={18} delay={0.08}>
            <PremiumProfileCard />
          </RevealOnScroll>
        </div>
      </div>

      <LiveActivityFeed />

      <WalletFab onDeposit={tryDeposit} onWithdraw={tryWithdraw} />

      <DepositModal open={depositOpen} onOpenChange={setDepositOpen} />
      <WithdrawModal open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </>
  )
}
