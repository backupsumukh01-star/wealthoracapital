'use client'

import { useState } from 'react'
import { Bell, SlidersHorizontal } from 'lucide-react'

import { DisplayCurrencySelector } from '@/components/dashboard/display-currency-selector'
import { SettingsCard } from '@/components/dashboard/settings-card'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'

function PrefRow({
  label,
  hint,
  checked,
  onCheckedChange,
  locked,
}: {
  label: string
  hint: string
  checked: boolean
  onCheckedChange?: (v: boolean) => void
  locked?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/70 py-3 last:border-0 sm:gap-4 sm:py-3.5">
      <div className="min-w-0">
        <p className="text-body-sm font-medium text-fg">{label}</p>
        <p className="text-pretty text-caption text-fg-subtle">{hint}</p>
      </div>
      <Switch
        checked={checked}
        disabled={locked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        className="shrink-0"
      />
    </div>
  )
}

export function PreferencesPanel() {
  const [daily, setDaily] = useState(true)
  const [marketing, setMarketing] = useState(false)
  const [push, setPush] = useState(true)

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <SettingsCard
        title="Display Currency"
        description="Changes presentation only. Accounting stays in USD."
        icon={SlidersHorizontal}
      >
        <DisplayCurrencySelector />
      </SettingsCard>

      <SettingsCard
        title="Email notifications"
        description="Money decisions are always sent and cannot be turned off."
        icon={Bell}
      >
        <PrefRow label="Deposit & withdrawal decisions" hint="Always on" checked locked />
        <PrefRow
          label="Daily settlement summary"
          hint="End-of-day return email"
          checked={daily}
          onCheckedChange={(v) => {
            setDaily(v)
            toast.success('Preference saved')
          }}
        />
        <PrefRow
          label="Product updates"
          hint="Optional desk notes and product news"
          checked={marketing}
          onCheckedChange={(v) => {
            setMarketing(v)
            toast.success('Preference saved')
          }}
        />
      </SettingsCard>

      <SettingsCard title="Push & format" icon={SlidersHorizontal}>
        <PrefRow
          label="In-app push"
          hint="Browser notifications when permitted"
          checked={push}
          onCheckedChange={(v) => {
            setPush(v)
            toast.success('Preference saved')
          }}
        />
        <div className="flex items-center justify-between gap-3 py-3 sm:py-3.5">
          <div className="min-w-0">
            <p className="text-body-sm font-medium text-fg">Accounting currency</p>
            <p className="text-caption text-fg-subtle">Ledger unit of account (immutable)</p>
          </div>
          <p className="shrink-0 text-body-sm tabular-nums text-fg-muted">USD</p>
        </div>
      </SettingsCard>
    </div>
  )
}
