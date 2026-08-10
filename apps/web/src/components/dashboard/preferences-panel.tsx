'use client'

import { useEffect, useState } from 'react'
import { Bell, Palette, SlidersHorizontal } from 'lucide-react'
import { DISPLAY_CURRENCIES, type DisplayCurrency } from '@meridian/shared'

import { ThemeToggle } from '@/components/common/theme-toggle'
import { SettingsCard } from '@/components/dashboard/settings-card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { settingsService } from '@/services/settings.service'

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
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('USD')
  const [currencyLoaded, setCurrencyLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void settingsService
      .me()
      .then((data) => {
        if (cancelled) return
        const raw = typeof data.displayCurrency === 'string' ? data.displayCurrency : 'USD'
        if ((DISPLAY_CURRENCIES as readonly string[]).includes(raw)) {
          setDisplayCurrency(raw as DisplayCurrency)
        }
        setCurrencyLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setCurrencyLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function saveCurrency(next: DisplayCurrency) {
    setDisplayCurrency(next)
    try {
      await settingsService.updateMe({ displayCurrency: next })
      toast.success('Display currency saved — ledger remains USD')
    } catch {
      toast.error('Could not save display currency')
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <SettingsCard
        title="Appearance"
        description="Dark is the default. Light is fully supported."
        icon={Palette}
        action={<ThemeToggle />}
      >
        <p className="text-caption text-fg-subtle">Theme controls live in the header of this card.</p>
      </SettingsCard>

      <SettingsCard
        title="Display currency"
        description="Changes presentation only. Accounting stays in USD."
        icon={SlidersHorizontal}
      >
        <div className="flex items-center justify-between gap-3 py-1">
          <div className="min-w-0">
            <p className="text-body-sm font-medium text-fg">Preferred currency</p>
            <p className="text-caption text-fg-subtle">
              Used for converted money displays where applicable.
            </p>
          </div>
          <Select
            value={displayCurrency}
            disabled={!currencyLoaded}
            onValueChange={(v) => void saveCurrency(v as DisplayCurrency)}
          >
            <SelectTrigger className="w-[7.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISPLAY_CURRENCIES.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
