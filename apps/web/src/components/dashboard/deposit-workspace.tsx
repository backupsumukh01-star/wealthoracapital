'use client'

/**
 * Investor deposit flow — OxaPay gateway only (no manual transfer / method picker).
 */

import { useMemo, useState } from 'react'
import { API_ROUTES, type Deposit, type PaymentMethod } from '@meridian/shared'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { DepositProofViewer } from '@/components/common/deposit-proof-viewer'
import { DualMoney } from '@/components/common/dual-money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/dashboard/status-pill'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import {
  useCreateOxapayDeposit,
  useDepositMethods,
  useDeposits,
  useOxapayStatus,
} from '@/features/deposits/hooks'
import { ApiError } from '@/lib/api-client'
import { formatDateTime } from '@/lib/format'
import { filterUsdInvestorPaymentMethods } from '@/lib/usd-only-investor-payments'
import { useSession } from '@/providers/session-provider'

type Step = 'amount' | 'gateway'

function isCryptoType(type: string) {
  return ['CRYPTO', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH'].includes(type)
}

function parseAmount(raw: string) {
  const n = Number(raw.trim())
  return Number.isFinite(n) ? n : NaN
}

function DepositHistory() {
  const { session } = useSession()
  const { data, isLoading } = useDeposits(undefined, { enabled: Boolean(session) })
  const [openId, setOpenId] = useState<string | null>(null)
  const rows = data?.items ?? []
  const openRow = rows.find((r) => r.id === openId) ?? null

  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader title="Deposit history" description="API-backed requests only." as="h3" />
      {isLoading ? (
        <p className="text-body-sm text-fg-subtle mt-4">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-body-sm text-fg-subtle mt-4">No deposits yet.</p>
      ) : (
        <ul className="divide-line/70 mt-4 divide-y">
          {rows.map((row) => (
            <li key={row.id} className="space-y-3 py-3.5 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-sm text-fg font-medium">{row.reference || row.id}</p>
                  <p className="text-caption text-fg-subtle">
                    {row.method?.name ?? 'Deposit'} · {formatDateTime(row.createdAt)}
                    {row.hasProof ? ' · Proof on file' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <DualMoney
                    usd={row.amount}
                    inr={row.amountInr ?? row.depositInr}
                    className="text-body-sm font-medium"
                  />
                  <StatusPill status={row.status} />
                  {row.hasProof || row.proofImageUrl ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpenId(openId === row.id ? null : row.id)}
                    >
                      {openId === row.id ? 'Hide proof' : 'View proof'}
                    </Button>
                  ) : null}
                </div>
              </div>
              {openRow?.id === row.id ? (
                <DepositProofViewer
                  proofUrl={row.proofImageUrl ?? row.proofUrl ?? API_ROUTES.deposits.proofFile(row.id)}
                  hasProof={row.hasProof}
                  compact
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function DepositFlow({ methods: rawMethods }: { methods: PaymentMethod[] }) {
  const methods = filterUsdInvestorPaymentMethods(rawMethods).filter((m) => isCryptoType(m.type))
  const createOxapay = useCreateOxapayDeposit()
  const { data: oxapayStatus } = useOxapayStatus()
  const oxapayEnabled = Boolean(oxapayStatus?.enabled)

  const selected = methods[0] ?? null
  const [step, setStep] = useState<Step>('amount')
  const [depositUsd, setDepositUsd] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<Deposit | null>(null)

  const min = Number(selected?.minAmount ?? '1')
  const max = selected?.maxAmount ? Number(selected.maxAmount) : null
  const amountNum = parseAmount(depositUsd)
  const amountError = useMemo(() => {
    if (!depositUsd.trim()) return 'Enter a deposit amount.'
    if (!Number.isFinite(amountNum) || amountNum <= 0) return 'Amount must be a positive number.'
    if (amountNum < min) return `Minimum deposit is $${Number(selected?.minAmount ?? min).toFixed(2)}.`
    if (max != null && amountNum > max) {
      return `Maximum deposit is $${Number(selected?.maxAmount).toFixed(2)}.`
    }
    return null
  }, [amountNum, depositUsd, max, min, selected?.maxAmount, selected?.minAmount])

  function onAmountChange(raw: string) {
    setDepositUsd(raw.replace(/[^\d.]/g, ''))
  }

  async function startOxapayCheckout() {
    if (!selected) return
    if (amountError) {
      toast.error(amountError)
      return
    }
    if (!oxapayEnabled) {
      toast.error('Crypto checkout is not available right now. Contact support.')
      return
    }
    setSubmitting(true)
    try {
      const deposit = await createOxapay.mutateAsync({
        amount: depositUsd.trim(),
        methodId: selected.id,
        notes: notes.trim() || undefined,
      })
      const paymentUrl = deposit.paymentUrl
      if (!paymentUrl) {
        throw new Error('Checkout URL was not returned. Please try again.')
      }
      setSubmitted(deposit)
      setStep('gateway')
      toast.success('Checkout ready', 'Complete payment in the OxaPay window.')
      window.location.assign(paymentUrl)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not start crypto checkout.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function resetFlow() {
    setStep('amount')
    setDepositUsd('')
    setNotes('')
    setSubmitted(null)
  }

  if (methods.length === 0) {
    return (
      <Card variant="glass" className="p-6">
        <p className="text-body-sm text-fg-subtle">
          Crypto checkout is not configured yet. Contact support.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <Card variant="glass" className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SectionHeader
            title="New deposit"
            description="Enter an amount and pay securely through crypto checkout."
            as="h3"
          />
          <p className="text-caption text-fg-subtle tabular-nums">
            {step === 'amount' ? 'Amount' : 'Checkout'}
          </p>
        </div>

        {step === 'amount' && selected ? (
          <div className="mx-auto max-w-md space-y-4">
            <FormField
              label="Investment amount (USDT)"
              required
              hint={`Minimum $${Number(selected.minAmount).toFixed(2)}${selected.maxAmount ? ` · Maximum $${Number(selected.maxAmount).toFixed(2)}` : ''}`}
              error={depositUsd.trim() ? amountError ?? undefined : undefined}
            >
              <Input
                prefix="USDT"
                inputMode="decimal"
                value={depositUsd}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="Enter USDT amount"
                className="pl-16"
                autoFocus
              />
            </FormField>

            <FormField label="Notes (optional)">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional note for this deposit"
              />
            </FormField>

            {oxapayEnabled ? (
              <Button
                type="button"
                className="w-full"
                onClick={() => void startOxapayCheckout()}
                disabled={Boolean(amountError) || submitting}
                loading={submitting}
              >
                {submitting ? 'Opening checkout…' : 'Pay with crypto checkout'}
                <ArrowRight aria-hidden />
              </Button>
            ) : (
              <p className="text-body-sm text-warning text-center">
                Crypto checkout is temporarily unavailable. Please try again later or contact
                support.
              </p>
            )}
            <p className="text-caption text-fg-subtle text-center">
              Your balance updates after the payment gateway confirms the transfer.
            </p>
          </div>
        ) : null}

        {step === 'gateway' && submitted ? (
          <div className="mx-auto max-w-md space-y-4 text-center">
            <CheckCircle2 className="text-accent-300 mx-auto size-10" aria-hidden />
            <SectionHeader
              title="Complete payment in OxaPay"
              description="Your balance updates only after OxaPay confirms the payment on the server. Returning to this site alone does not credit funds."
              as="h3"
            />
            <p className="text-caption text-fg-subtle">
              Reference {submitted.reference}
              {submitted.oxapayTrackId ? ` · Track ${submitted.oxapayTrackId}` : ''}
            </p>
            {submitted.paymentUrl ? (
              <Button type="button" className="w-full" asChild>
                <a href={submitted.paymentUrl}>Open checkout again</a>
              </Button>
            ) : null}
            <Button type="button" variant="secondary" className="w-full" onClick={resetFlow}>
              Start another deposit
            </Button>
          </div>
        ) : null}
      </Card>

      <DepositHistory />
    </div>
  )
}

export function DepositWorkspace() {
  const { session } = useSession()
  const { data: methods, isLoading } = useDepositMethods({ enabled: Boolean(session) })

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Deposit"
        description="Fund your Wealthora wallet through secure crypto checkout."
      />
      {isLoading ? (
        <Card variant="glass" className="p-6">
          <p className="text-body-sm text-fg-subtle">Loading deposit checkout…</p>
        </Card>
      ) : (
        <DepositFlow methods={methods ?? []} />
      )}
    </div>
  )
}
