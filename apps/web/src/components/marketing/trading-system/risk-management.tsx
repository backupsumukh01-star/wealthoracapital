'use client'

import { CircularMeter } from './circular-meter'
import { GlassCard, SubHeading } from './glass-card'

const METERS = [
  { label: 'Maximum Risk Per Position', value: 72, display: '1.0%', tone: 'amber' as const },
  { label: 'Daily Loss Limit', value: 65, display: '3%', tone: 'violet' as const },
  { label: 'Maximum Open Trades', value: 55, display: '8', tone: 'cyan' as const },
  { label: 'Stop Loss', value: 88, display: 'On', tone: 'emerald' as const },
  { label: 'Take Profit', value: 80, display: 'On', tone: 'accent' as const },
  { label: 'Risk Reward Ratio', value: 70, display: '1:2+', tone: 'cyan' as const },
  { label: 'Capital Allocation', value: 60, display: 'Capped', tone: 'amber' as const },
]

export function RiskManagementPanel() {
  return (
    <div>
      <SubHeading
        eyebrow="Risk management"
        title="Hard limits before every ticket"
        subtitle="Controls the desk enforces — not personalised advice."
      />

      <GlassCard glow="accent" interactive={false} className="p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-overline text-hl-cyan">Risk dashboard</p>
            <p className="mt-1 text-heading-sm text-fg">Live policy snapshot · demo</p>
          </div>
          <span className="rounded-full border border-hl-emerald/30 bg-hl-emerald/10 px-3 py-1 text-[11px] font-medium text-hl-emerald">
            All gates green
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-7">
          {METERS.map((m) => (
            <CircularMeter
              key={m.label}
              label={m.label}
              value={m.value}
              display={m.display}
              tone={m.tone}
            />
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
