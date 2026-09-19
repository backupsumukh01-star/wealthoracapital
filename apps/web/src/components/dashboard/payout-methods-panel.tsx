'use client'

import { useMemo, useState } from 'react'
import type { PayoutMethod } from '@meridian/shared'
import { MoreHorizontal, Plus } from 'lucide-react'

import { AddBankAccountDialog } from '@/components/dashboard/add-bank-account-dialog'
import { AddCryptoWalletDialog } from '@/components/dashboard/add-crypto-wallet-dialog'
import { SectionHeader } from '@/components/common/page-header'
import { StatusPill } from '@/components/dashboard/status-pill'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CopyButton } from '@/components/ui/copy-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/toast'
import {
  useDeletePayoutMethod,
  usePayoutMethods,
  useSetDefaultPayoutMethod,
} from '@/features/withdrawals/hooks'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/cn'
import { useSession } from '@/providers/session-provider'

function isCryptoType(type: string) {
  return ['CRYPTO', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH'].includes(type)
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong'
}

export function PayoutMethodsPanel() {
  const { session } = useSession()
  const { data: methods = [], isLoading } = usePayoutMethods({ enabled: Boolean(session) })
  const deleteMethod = useDeletePayoutMethod()
  const setDefault = useSetDefaultPayoutMethod()

  const [bankOpen, setBankOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<PayoutMethod | null>(null)
  const [editingWallet, setEditingWallet] = useState<PayoutMethod | null>(null)

  const banks = useMemo(
    () => methods.filter((m) => !isCryptoType(m.type)),
    [methods],
  )
  const wallets = useMemo(
    () => methods.filter((m) => isCryptoType(m.type)),
    [methods],
  )

  async function onSetDefault(id: string) {
    try {
      await setDefault.mutateAsync(id)
      toast.success('Primary payout method updated')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteMethod.mutateAsync(id)
      toast.success('Payout method removed')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <>
      <Card variant="glass" className="p-5 sm:p-6">
        <SectionHeader
          title="Bank accounts"
          description="INR destinations for withdrawals."
          as="h2"
          actions={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditingBank(null)
                setBankOpen(true)
              }}
            >
              <Plus aria-hidden />
              Add bank
            </Button>
          }
        />
        {isLoading ? (
          <p className="mt-5 text-body-sm text-fg-subtle">Loading payout methods…</p>
        ) : banks.length === 0 ? (
          <p className="mt-5 text-body-sm text-fg-subtle">No bank accounts configured.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {banks.map((b) => (
              <li
                key={b.id}
                className={cn(
                  'rounded-xl border px-4 py-3.5',
                  b.isDefault ? 'border-accent-700/40 bg-accent-500/8' : 'border-line bg-inset/30',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body-sm font-medium text-fg">{b.label}</p>
                      {b.isDefault ? (
                        <span className="text-caption text-accent-300">Primary</span>
                      ) : null}
                      <StatusPill status={b.isVerified ? 'APPROVED' : 'PENDING'} />
                    </div>
                    <p className="mt-1 text-caption text-fg-muted">{b.maskedDetails}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-9 shrink-0 rounded-full p-0"
                        aria-label={`Manage ${b.label}`}
                      >
                        <MoreHorizontal aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditingBank(b)
                          setBankOpen(true)
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      {!b.isDefault ? (
                        <DropdownMenuItem onSelect={() => void onSetDefault(b.id)}>
                          Set as primary
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem destructive onSelect={() => void onDelete(b.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card variant="glass" className="p-5 sm:p-6">
        <SectionHeader
          title="Crypto wallets"
          description="Checked addresses only — typed destinations are not accepted at withdrawal time."
          as="h2"
          actions={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditingWallet(null)
                setWalletOpen(true)
              }}
            >
              <Plus aria-hidden />
              Add wallet
            </Button>
          }
        />
        {isLoading ? (
          <p className="mt-5 text-body-sm text-fg-subtle">Loading wallets…</p>
        ) : wallets.length === 0 ? (
          <p className="mt-5 text-body-sm text-fg-subtle">No crypto wallets configured.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {wallets.map((w) => (
              <li
                key={w.id}
                className={cn(
                  'rounded-xl border px-4 py-3.5',
                  w.isDefault ? 'border-accent-700/40 bg-accent-500/8' : 'border-line bg-inset/30',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body-sm font-medium text-fg">{w.label}</p>
                      {w.isDefault ? (
                        <span className="text-caption text-accent-300">Primary</span>
                      ) : null}
                      <span className="text-caption text-fg-subtle">
                        {w.type.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-2 flex items-start gap-2">
                      <p className="min-w-0 flex-1 break-all font-mono text-caption text-fg-muted">
                        {w.maskedDetails}
                      </p>
                      <CopyButton
                        value={w.details?.address ?? w.maskedDetails}
                        label="Wallet address"
                      />
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-9 shrink-0 rounded-full p-0"
                        aria-label={`Manage ${w.label}`}
                      >
                        <MoreHorizontal aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditingWallet(w)
                          setWalletOpen(true)
                        }}
                      >
                        Edit
                      </DropdownMenuItem>
                      {!w.isDefault ? (
                        <DropdownMenuItem onSelect={() => void onSetDefault(w.id)}>
                          Set as primary
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem destructive onSelect={() => void onDelete(w.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <AddBankAccountDialog
        open={bankOpen}
        onOpenChange={(open) => {
          setBankOpen(open)
          if (!open) setEditingBank(null)
        }}
        method={editingBank}
        defaultAsPrimary={banks.length === 0}
      />
      <AddCryptoWalletDialog
        open={walletOpen}
        onOpenChange={(open) => {
          setWalletOpen(open)
          if (!open) setEditingWallet(null)
        }}
        method={editingWallet}
        defaultAsPrimary={wallets.length === 0}
      />
    </>
  )
}
