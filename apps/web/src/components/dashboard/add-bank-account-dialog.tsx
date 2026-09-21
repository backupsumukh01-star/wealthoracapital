'use client'

import { useEffect, useState } from 'react'
import type { PayoutMethod } from '@meridian/shared'

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
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import {
  useCreatePayoutMethod,
  useUpdatePayoutMethod,
} from '@/features/withdrawals/hooks'
import { ApiError } from '@/lib/api-client'

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Could not save bank account'
}

type AddBankAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  method?: PayoutMethod | null
  /** When true, new methods are marked default (e.g. first bank). */
  defaultAsPrimary?: boolean
}

export function AddBankAccountDialog({
  open,
  onOpenChange,
  method,
  defaultAsPrimary = false,
}: AddBankAccountDialogProps) {
  const createMethod = useCreatePayoutMethod()
  const updateMethod = useUpdatePayoutMethod()
  const editing = Boolean(method)

  const [accountHolderName, setAccountHolderName] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const details = method?.details ?? {}
    setAccountHolderName(details.accountHolderName ?? '')
    setBankName(details.bankName ?? '')
    setAccountNumber(details.accountNumber ?? '')
    setConfirmAccountNumber(details.accountNumber ?? '')
    setIfscCode(details.ifscCode ?? '')
    setIsDefault(method?.isDefault ?? defaultAsPrimary)
  }, [open, method, defaultAsPrimary])

  async function onSubmit() {
    if (!accountHolderName.trim() || !bankName.trim() || !accountNumber.trim() || !ifscCode.trim()) {
      toast.error('Complete all bank fields.')
      return
    }
    if (accountNumber !== confirmAccountNumber) {
      toast.error('Account numbers do not match.')
      return
    }

    setBusy(true)
    try {
      const details = {
        accountHolderName: accountHolderName.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
      }
      const label = `${bankName.trim()} ${accountNumber.trim().slice(-4)}`

      if (method) {
        await updateMethod.mutateAsync({
          id: method.id,
          body: { label, details, isDefault },
        })
        toast.success('Bank account updated')
      } else {
        await createMethod.mutateAsync({
          label,
          type: 'BANK_TRANSFER',
          details,
          isDefault,
        })
        toast.success('Bank account saved')
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
          <DialogTitle>{editing ? 'Edit bank account' : 'Add bank account'}</DialogTitle>
          <DialogDescription>
            Bank account for withdrawals. Use an account you control.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          <FormField label="Account holder name" required>
            <Input
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              autoComplete="name"
            />
          </FormField>
          <FormField label="Bank name" required>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </FormField>
          <FormField label="Account number" required>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
            />
          </FormField>
          <FormField label="Confirm account number" required>
            <Input
              value={confirmAccountNumber}
              onChange={(e) => setConfirmAccountNumber(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
            />
          </FormField>
          <FormField label="IFSC" required>
            <Input
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              className="uppercase"
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
              aria-label="Set as primary bank account"
            />
          </div>
        </div>

        <DialogFooter className="mt-5">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" loading={busy} onClick={() => void onSubmit()}>
            {editing ? 'Save changes' : 'Add bank'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
