'use client'

import { useMemo, useState } from 'react'
import type { Deposit, PaymentMethod } from '@meridian/shared'
import { Upload } from 'lucide-react'

import { DepositMethodCard } from '@/components/deposits/deposit-method-card'
import { Money } from '@/components/common/money'
import { PageHeader, SectionHeader } from '@/components/common/page-header'
import { RiskDisclosure } from '@/components/common/risk-disclosure'
import { StatusPill } from '@/components/dashboard/status-pill'
import { StatusTimeline } from '@/components/dashboard/status-timeline'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import {
  useCreateDeposit,
  useDepositMethods,
  useDeposits,
  useUploadDepositProof,
} from '@/features/deposits/hooks'
import { ApiError } from '@/lib/api-client'
import { formatDateTime } from '@/lib/format'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

const DEPOSIT_TIMELINE_STEPS = [
  { id: 'submit', label: 'Submitted', done: false, current: true },
  { id: 'review', label: 'Under review', done: false },
  { id: 'credit', label: 'Credited', done: false },
]

function isCryptoType(type: string) {
  return ['CRYPTO', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH'].includes(type)
}

function timelineActiveIndex(status: Deposit['status'] | undefined) {
  if (!status) return 0
  if (status === 'APPROVED') return 2
  if (status === 'UNDER_REVIEW' || status === 'PENDING') return 1
  return 0
}

function DepositHistory({ filter }: { filter?: (d: Deposit) => boolean }) {
  const { session } = useSession()
  const { data, isLoading } = useDeposits(undefined, { enabled: Boolean(session) })
  const rows = (data?.items ?? []).filter((d) => (filter ? filter(d) : true))
  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader
        title="Deposit history"
        description="Recent requests and their review status."
        as="h3"
      />
      {isLoading ? (
        <p className="mt-4 text-body-sm text-fg-subtle">Loading deposits…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-body-sm text-fg-subtle">No deposits yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line/70">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0"
            >
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-fg">{row.reference || row.id}</p>
                <p className="text-caption text-fg-subtle">
                  {row.method?.name ?? 'Deposit'} · {formatDateTime(row.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Money value={row.amount} className="text-body-sm font-medium" />
                <StatusPill status={row.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function DepositFlow({ methods }: { methods: PaymentMethod[] }) {
  const { session } = useSession()
  const { data: depositsData } = useDeposits(undefined, { enabled: Boolean(session) })
  const createDeposit = useCreateDeposit()
  const uploadProof = useUploadDepositProof()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [amount, setAmount] = useState('500')
  const [proof, setProof] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selected = useMemo(
    () => methods.find((m) => m.id === (selectedId ?? methods[0]?.id)) ?? methods[0],
    [methods, selectedId],
  )

  const pending = (depositsData?.items ?? []).find(
    (d) => d.status === 'UNDER_REVIEW' || d.status === 'PENDING',
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) {
      toast.error('No deposit methods are configured. Contact support.')
      return
    }
    setSubmitting(true)
    try {
      const deposit = await createDeposit.mutateAsync({ amount, methodId: selected.id })
      if (proof) {
        await uploadProof.mutateAsync({ id: deposit.id, file: proof })
      }
      toast.success('Deposit submitted', 'Awaiting proof review.')
      setProof(null)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not submit deposit.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (methods.length === 0) {
    return (
      <Card variant="glass" className="p-6">
        <p className="text-body-sm text-fg-subtle">
          No deposit methods are available right now. Please contact support.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <SectionHeader
            title="Choose method"
            description="Select how you want to fund your account."
            as="h3"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {methods.map((method) => (
              <DepositMethodCard
                key={method.id}
                method={method}
                selected={selected?.id === method.id}
                onSelect={() => setSelectedId(method.id)}
                showActions={false}
                className={cn(selected?.id === method.id && 'bg-surface/70')}
              />
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {selected ? <DepositMethodCard method={selected} /> : null}

          <Card variant="glass" className="p-5 sm:p-6">
            <SectionHeader
              title="Submit deposit"
              description={`Minimum $${selected?.minAmount ?? '50'}${
                selected?.maxAmount ? ` · Maximum $${selected.maxAmount}` : ''
              }`}
            />
            <form className="mt-5 space-y-4" onSubmit={(e) => void onSubmit(e)}>
              <FormField label="Amount (USD)" required>
                <Input
                  numeric
                  prefix="$"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500.00"
                />
              </FormField>
              <FormField label="Payment proof (optional)">
                <FileDropzone
                  hint="JPG, PNG, WebP or PDF — attach after you transfer."
                  onFileSelect={(file) => {
                    setProof(file)
                    toast.info('Proof attached')
                  }}
                />
              </FormField>
              <Button type="submit" className="w-full sm:w-auto" loading={submitting}>
                <Upload aria-hidden />
                Submit deposit request
              </Button>
            </form>
          </Card>

          <Card variant="glass" className="p-5 sm:p-6">
            <SectionHeader
              title="Pending approval"
              description={
                pending
                  ? `${pending.reference || pending.id} · $${pending.amount} under review`
                  : 'No deposits awaiting review.'
              }
              as="h3"
            />
            <div className="mt-5">
              <StatusTimeline
                steps={DEPOSIT_TIMELINE_STEPS}
                activeIndex={timelineActiveIndex(pending?.status)}
              />
            </div>
          </Card>
        </div>
      </div>

      <DepositHistory />
    </div>
  )
}

export function DepositWorkspace() {
  const { session } = useSession()
  const { data: methods, isLoading } = useDepositMethods({ enabled: Boolean(session) })

  const fiatMethods = (methods ?? []).filter((m) => !isCryptoType(m.type))
  const cryptoMethods = (methods ?? []).filter((m) => isCryptoType(m.type))
  const hasTabs = fiatMethods.length > 0 && cryptoMethods.length > 0

  return (
    <div className="space-y-6 lg:space-y-8">
      <PageHeader
        title="Deposit"
        description="Fund your Growzy wallet using the payment methods configured by operations."
      />

      {isLoading ? (
        <Card variant="glass" className="p-6">
          <p className="text-body-sm text-fg-subtle">Loading deposit methods…</p>
        </Card>
      ) : hasTabs ? (
        <Tabs defaultValue="fiat">
          <TabsList>
            <TabsTrigger value="fiat">Bank / UPI / Manual</TabsTrigger>
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
          </TabsList>
          <TabsContent value="fiat" className="mt-5">
            <DepositFlow methods={fiatMethods} />
          </TabsContent>
          <TabsContent value="crypto" className="mt-5">
            <DepositFlow methods={cryptoMethods} />
          </TabsContent>
        </Tabs>
      ) : (
        <DepositFlow methods={methods ?? []} />
      )}

      <RiskDisclosure />
    </div>
  )
}
