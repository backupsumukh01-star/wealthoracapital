'use client'

import {
  Activity,
  Bot,
  CandlestickChart,
  CircleCheck,
  Clock3,
  Radio,
  Scale,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react'

import { ProcessFlow } from './process-flow'

const STEPS = [
  { title: 'Market opens', detail: 'Session windows and liquidity are marked live.', icon: Clock3 },
  { title: 'AI analyses markets', detail: 'Models score setups against regime and volatility.', icon: Bot },
  { title: 'Signals generated', detail: 'Candidates ranked by edge, size and session fit.', icon: Sparkles },
  { title: 'Human validation', detail: 'Desk reviews edge cases before anything is booked.', icon: Scale },
  { title: 'Trades executed', detail: 'Tickets hit the book under published risk limits.', icon: CandlestickChart },
  { title: 'Risk monitored', detail: 'Open exposure watched until every position closes.', icon: Shield },
  { title: 'Positions closed', detail: 'Exits recorded with entry, exit and return %.', icon: Activity },
  { title: 'Performance verified', detail: 'Operator confirms the day figure before publish.', icon: CircleCheck },
  { title: 'Daily return distributed', detail: 'Eligible wallets update in a single atomic run.', icon: Wallet },
]

/** Day-in-the-life operating model — animated vertical flow. */
export function OperatingModel() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-5 sm:p-7 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-overline text-accent-300">Operating model</p>
          <h3 className="mt-1 text-heading-sm text-fg">How the desk runs a trading day</h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-profit/30 bg-profit/10 px-2.5 py-1 text-[11px] font-medium text-profit">
          <Radio className="size-3.5 animate-pulse" aria-hidden />
          Live process
        </span>
      </div>
      <ProcessFlow steps={STEPS} />
    </div>
  )
}
