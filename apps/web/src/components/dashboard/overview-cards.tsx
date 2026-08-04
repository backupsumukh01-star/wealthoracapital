'use client'

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChartNoAxesCombined,
  CircleDollarSign,
  PiggyBank,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { Money } from '@/components/common/money'
import { Percent } from '@/components/common/percent'
import { StatCard } from '@/components/common/stat-card'
import { CountUp } from '@/components/motion/count-up'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { DEMO_WALLET } from '@/lib/dashboard-data'

/** Portfolio KPIs for the investor home. */
export function OverviewCards() {
  return (
    <StaggerGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StaggerItem>
        <StatCard
          label="Portfolio overview"
          icon={CircleDollarSign}
          hint="Invested capital currently participating in the programme."
          value={
            <CountUp
              value={DEMO_WALLET.investedAmount}
              prefix="$"
              decimals={2}
              className="text-stat-lg text-fg"
            />
          }
          delta={
            <span>
              Wallet <Money value={DEMO_WALLET.balance} size="sm" />
            </span>
          }
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          label="Available balance"
          icon={Wallet}
          hint="Spendable balance after pending withdrawal locks."
          value={
            <CountUp
              value={DEMO_WALLET.availableBalance}
              prefix="$"
              decimals={2}
              className="text-stat-lg text-fg"
            />
          }
          delta={
            <span>
              Locked <Money value={DEMO_WALLET.lockedBalance} size="sm" />
            </span>
          }
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          label="Today’s return"
          icon={TrendingUp}
          hint="The daily return applied to your eligible balance."
          value={<Money value={DEMO_WALLET.todayProfit} signed />}
          delta={<Percent value={DEMO_WALLET.todayReturnPct} showArrow />}
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          label="Total profit"
          icon={PiggyBank}
          hint="Lifetime realised profit credited to your wallet."
          value={
            <CountUp
              value={DEMO_WALLET.totalProfit}
              prefix="$"
              decimals={2}
              className="text-stat-lg text-profit"
            />
          }
          delta={<Percent value={DEMO_WALLET.totalRoiPct} showArrow />}
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          label="Total deposits"
          icon={ArrowDownToLine}
          hint="Lifetime approved deposits."
          value={<Money value={DEMO_WALLET.totalDeposited} />}
          delta={
            <span>
              Pending <Money value={DEMO_WALLET.pendingDeposit} size="sm" />
            </span>
          }
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          label="Total withdrawals"
          icon={ArrowUpFromLine}
          hint="Lifetime paid withdrawals."
          value={<Money value={DEMO_WALLET.totalWithdrawn} />}
          delta={
            <span className="inline-flex items-center gap-1 text-fg-muted">
              <ChartNoAxesCombined className="size-3.5" aria-hidden />
              30d <Percent value={DEMO_WALLET.growthPct30d} />
            </span>
          }
        />
      </StaggerItem>
    </StaggerGroup>
  )
}
