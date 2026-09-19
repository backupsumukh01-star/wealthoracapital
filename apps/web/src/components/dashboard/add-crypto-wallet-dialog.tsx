'use client'

import { useEffect, useState } from 'react'
import type { PaymentMethodType, PayoutMethod } from '@meridian/shared'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import {
  useCreatePayoutMethod,
  useUpdatePayoutMethod,
} from '@/features/withdrawals/hooks'
import { ApiError } from '@/lib/api-client'

type CryptoPayoutType = Extract<
  PaymentMethodType,
  'USDT_TRC20' | 'USDT_BEP20' | 'BTC' | 'ETH'
>

const CRYPTO_OPTIONS: { type: CryptoPayoutType; label: string; coin: string; network: string }[] = [
  { type: 'USDT_TRC20', label: 'USDT · TRC20', coin: 'USDT', network: 'TRC20' },
  { type: 'USDT_BEP20', label: 'USDT · BEP20', coin: 'USDT', network: 'BEP20' },
  { type: 'BTC', label: 'BTC', coin: 'BTC', network: 'BTC' },
  { type: 'ETH', label: 'ETH', coin: 'ETH', network: 'ETH' },
]

function metaFor(type: CryptoPayoutType) {
  return CRYPTO_OPTIONS.find((o) => o.type === type) ?? CRYPTO_OPTIONS[0]!
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Could not save wallet'
}

type AddCryptoWalletDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  method?: PayoutMethod | null
  defaultAsPrimary?: boolean
}

export function AddCryptoWalletDialog({
  open,
  onOpenChange,
  method,
  defaultAsPrimary = false,
}: AddCryptoWalletDialogProps) {
  const createMethod = useCreatePayoutMethod()
  const updateMethod = useUpdatePayoutMethod()
  const editing = Boolean(method)

  const [cryptoType, setCryptoType] = useState<CryptoPayoutType>('USDT_TRC20')
  const [label, setLabel] = useState('')
  const [address, setAddress] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const details = method?.details ?? {}
    const type = (method?.type as CryptoPayoutType | undefined) ?? 'USDT_TRC20'
    setCryptoType(
      CRYPTO_OPTIONS.some((o) => o.type === type) ? type : 'USDT_TRC20',
    )
    setLabel(method?.label ?? '')
    setAddress(details.address ?? '')
    setIsDefault(method?.isDefault ?? defaultAsPrimary)
  }, [open, method, defaultAsPrimary])

  async function onSubmit() {
    if (!address.trim()) {
      toast.error('Wallet address is required.')
      return
    }

    const meta = metaFor(cryptoType)
    setBusy(true)
    try {
      const details = {
        coin: meta.coin,
        network: meta.network,
        address: address.trim(),
      }
      const nextLabel = label.trim() || `${meta.coin} ${meta.network}`

      if (method) {
        await updateMethod.mutateAsync({
          id: method.id,
          body: { label: nextLabel, details, isDefault },
        })
        toast.success('Wallet updated')
      } else {
        await createMethod.mutateAsync({
          label: nextLabel,
          type: cryptoType,
          details,
          isDefault,
        })
        toast.success('Wallet saved')
      }
      onOpenChange(false)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit crypto wallet' : 'Add crypto wallet'}</DialogTitle>
          <DialogDescription>
            Saved addresses only — typed destinations are not accepted at withdrawal time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          <FormField label="Coin / network" required>
            <Select
              value={cryptoType}
              onValueChange={(v) => setCryptoType(v as CryptoPayoutType)}
              disabled={editing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRYPTO_OPTIONS.map((item) => (
                  <SelectItem key={item.type} value={item.type}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Label (optional)">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`${metaFor(cryptoType).coin} ${metaFor(cryptoType).network}`}
            />
          </FormField>
          <FormField label="Wallet address" required>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="font-mono text-sm"
              placeholder="Paste address"
              autoComplete="off"
            />
          </FormField>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-inset/30 px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-fg">Set as primary</p>
              <p className="text-caption text-fg-subtle">Used by default on withdraw</p>
            </div>
            <Switch
              checked={isDefault}
              onCheckedChange={setIsDefault}
              aria-label="Set as primary wallet"
            />
          </div>
        </div>

        <DialogFooter className="mt-5">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" loading={busy} onClick={() => void onSubmit()}>
            {editing ? 'Save changes' : 'Add wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
