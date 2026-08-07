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
import { useWalletSummary } from '@/features/wallet/hooks'
import { useSession } from '@/providers/session-provider'

/** Portfolio KPIs for the investor home — live wallet summary. */
export function OverviewCards() {
  const { session } = useSession()
  const { data: summary } = useWalletSummary({ enabled: Boolean(session) })
  const wallet = summary?.wallet ?? session?.wallet
  const investedAmount = wallet?.investedAmount ?? '0.00'
  const balance = wallet?.availableBalance ?? '0.00'
  const availableBalance = wallet?.availableBalance ?? '0.00'
  const totalProfit = wallet?.totalProfit ?? '0.00'
  const totalDeposited = wallet?.totalDeposited ?? '0.00'
  const pendingDeposit = summary?.pending?.depositAmount ?? '0.00'
  const totalWithdrawn = wallet?.totalWithdrawn ?? '0.00'
  const todayProfit = summary?.today.profit ?? '0.00'
  const todayReturnPct = summary?.today.returnPct ?? '0.00'
  const totalRoiPct =
    wallet && Number(wallet.totalDeposited) > 0
      ? ((Number(wallet.totalProfit) / Number(wallet.totalDeposited)) * 100).toFixed(2)
      : '0.00'

  return (
    <StaggerGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StaggerItem>
        <StatCard
          label="Portfolio overview"
          icon={CircleDollarSign}
          hint="Invested capital currently participating in the programme."
          value={
            <CountUp
              value={investedAmount}
              prefix="$"
              decimals={2}
              className="text-stat-lg text-fg"
            />
          }
          delta={
            <span>
              Wallet <Money value={balance} size="sm" />
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
              value={availableBalance}
              prefix="$"
              decimals={2}
              className="text-stat-lg text-fg"
            />
          }
          delta={
            <span>
              Locked <Money value={wallet?.lockedBalance ?? '0.00'} size="sm" />
            </span>
          }
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          label="Today’s return"
          icon={TrendingUp}
          hint="The daily return applied to your eligible balance."
          value={<Money value={todayProfit} signed />}
          delta={<Percent value={todayReturnPct} showArrow />}
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          label="Total profit"
          icon={PiggyBank}
          hint="Lifetime realised profit credited to your wallet."
          value={
            <CountUp
              value={totalProfit}
              prefix="$"
              decimals={2}
              className="text-stat-lg text-profit"
            />
          }
          delta={<Percent value={totalRoiPct} showArrow />}
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          label="Total deposits"
          icon={ArrowDownToLine}
          hint="Lifetime approved deposits."
          value={<Money value={totalDeposited} />}
          delta={
            <span>
              Pending <Money value={pendingDeposit} size="sm" />
            </span>
          }
        />
      </StaggerItem>

      <StaggerItem>
        <StatCard
          label="Total withdrawals"
          icon={ArrowUpFromLine}
          hint="Lifetime paid withdrawals."
          value={<Money value={totalWithdrawn} />}
          delta={
            <span className="inline-flex items-center gap-1 text-fg-muted">
              <ChartNoAxesCombined className="size-3.5" aria-hidden />
              Lifetime
            </span>
          }
        />
      </StaggerItem>
    </StaggerGroup>
  )
}
