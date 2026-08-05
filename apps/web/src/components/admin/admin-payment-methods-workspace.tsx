'use client'

/**
 * Production payment rails — CRUD via admin payment-methods + wallet-addresses APIs.
 * Replaces AdminPaymentsOsWorkspace (localStorage / in-memory mock).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import type { PaymentMethod } from '@meridian/shared'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAdminPlatformSettings } from '@/features/cms/site'
import { cmsQueryKeys } from '@/features/cms/hooks'
import { adminService } from '@/services/admin.service'
import { settingsService } from '@/services/settings.service'

const selectClass =
  'h-10 w-full rounded-lg border border-white/10 bg-inset/60 px-3 text-body-sm text-fg'

const METHOD_TYPES = [
  'BANK_TRANSFER',
  'USDT_TRC20',
  'USDT_BEP20',
  'BTC',
  'ETH',
  'MANUAL',
  'CRYPTO',
  'MOBILE_WALLET',
  'OTHER',
] as const

export function AdminPaymentMethodsWorkspace() {
  const qc = useQueryClient()
  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['admin', 'payment-methods'],
    queryFn: () => adminService.paymentMethods(),
  })
  const { data: addresses = [] } = useQuery({
    queryKey: ['admin', 'wallet-addresses'],
    queryFn: () => adminService.walletAddresses(),
  })
  const { data: settings } = useAdminPlatformSettings()

  const [name, setName] = useState('')
  const [type, setType] = useState<(typeof METHOD_TYPES)[number]>('BANK_TRANSFER')
  const [instructions, setInstructions] = useState('')
  const [minAmount, setMinAmount] = useState('50')
  const [maxAmount, setMaxAmount] = useState('100000')
  const [network, setNetwork] = useState('')
  const [addrLabel, setAddrLabel] = useState('')
  const [addrNetwork, setAddrNetwork] = useState('TRC20')
  const [addrValue, setAddrValue] = useState('')
  const [minDeposit, setMinDeposit] = useState('')
  const [maxDeposit, setMaxDeposit] = useState('')
  const [minWithdrawal, setMinWithdrawal] = useState('')
  const [maxWithdrawal, setMaxWithdrawal] = useState('')

  const createMethod = useMutation({
    mutationFn: () =>
      adminService.createPaymentMethod({
        name: name.trim(),
        type,
        instructions: instructions.trim(),
        minAmount,
        maxAmount: maxAmount || null,
        network: network || undefined,
        isActive: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'payment-methods'] })
      toast.success('Payment method created')
      setName('')
      setInstructions('')
    },
    onError: (err: Error) => toast.error(err.message || 'Create failed'),
  })

  const toggleMethod = useMutation({
    mutationFn: (m: PaymentMethod) =>
      adminService.updatePaymentMethod(m.id, { isActive: !m.isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'payment-methods'] })
      toast.success('Payment method updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Update failed'),
  })

  const deleteMethod = useMutation({
    mutationFn: (id: string) => adminService.deletePaymentMethod(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'payment-methods'] })
      toast.success('Payment method removed')
    },
    onError: (err: Error) => toast.error(err.message || 'Delete failed'),
  })

  const createAddress = useMutation({
    mutationFn: () =>
      adminService.createWalletAddress({
        label: addrLabel.trim(),
        network: addrNetwork.trim(),
        address: addrValue.trim(),
        isActive: true,
        isDefault: addresses.length === 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'wallet-addresses'] })
      toast.success('Wallet address created')
      setAddrLabel('')
      setAddrValue('')
    },
    onError: (err: Error) => toast.error(err.message || 'Create address failed'),
  })

  const deleteAddress = useMutation({
    mutationFn: (id: string) => adminService.deleteWalletAddress(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'wallet-addresses'] })
      toast.success('Address removed')
    },
    onError: (err: Error) => toast.error(err.message || 'Delete failed'),
  })

  const saveLimits = useMutation({
    mutationFn: () =>
      settingsService.adminUpdate({
        limits: {
          minDeposit: minDeposit || settings?.limits.minDeposit || '50',
          maxDeposit: maxDeposit || settings?.limits.maxDeposit || '100000',
          minWithdrawal: minWithdrawal || settings?.limits.minWithdrawal || '50',
          maxWithdrawal: maxWithdrawal || settings?.limits.maxWithdrawal || '50000',
        },
      }),
    onSuccess: (data) => {
      qc.setQueryData([...cmsQueryKeys.all, 'admin-settings'], data)
      toast.success('Platform limits saved')
    },
    onError: (err: Error) => toast.error(err.message || 'Limits save failed'),
  })

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Payment methods"
        description="Deposit rails and crypto addresses from the production admin API — not browser storage."
      />

      <AdminPanel>
        <AdminPanelHeader title="Platform limits" description="Persisted via settings API." />
        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
          <FormField label="Min deposit">
            <Input
              value={minDeposit || settings?.limits.minDeposit || ''}
              onChange={(e) => setMinDeposit(e.target.value)}
              placeholder={settings?.limits.minDeposit}
            />
          </FormField>
          <FormField label="Max deposit">
            <Input
              value={maxDeposit || settings?.limits.maxDeposit || ''}
              onChange={(e) => setMaxDeposit(e.target.value)}
              placeholder={settings?.limits.maxDeposit}
            />
          </FormField>
          <FormField label="Min withdrawal">
            <Input
              value={minWithdrawal || settings?.limits.minWithdrawal || ''}
              onChange={(e) => setMinWithdrawal(e.target.value)}
              placeholder={settings?.limits.minWithdrawal}
            />
          </FormField>
          <FormField label="Max withdrawal">
            <Input
              value={maxWithdrawal || settings?.limits.maxWithdrawal || ''}
              onChange={(e) => setMaxWithdrawal(e.target.value)}
              placeholder={settings?.limits.maxWithdrawal}
            />
          </FormField>
        </div>
        <div className="border-t border-white/[0.06] px-4 py-3 sm:px-5">
          <Button type="button" size="sm" disabled={saveLimits.isPending} onClick={() => saveLimits.mutate()}>
            Save limits
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          title="Deposit methods"
          description={isLoading ? 'Loading…' : `${methods.length} method(s)`}
        />
        <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
          {methods.length === 0 && !isLoading ? (
            <li className="py-6 text-caption text-fg-muted">No payment methods from API yet.</li>
          ) : (
            methods.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption">
                <div className="min-w-0">
                  <p className="font-medium text-fg">
                    {m.name}{' '}
                    <span className="text-fg-subtle">· {m.type}</span>
                  </p>
                  <p className="text-fg-muted">
                    {m.minAmount}–{m.maxAmount ?? '∞'} · {m.isActive ? 'Active' : 'Off'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={toggleMethod.isPending}
                    onClick={() => toggleMethod.mutate(m)}
                  >
                    {m.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={deleteMethod.isPending}
                    onClick={() => deleteMethod.mutate(m.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))
          )}
        </ul>
        <div className="grid gap-3 border-t border-white/[0.06] p-4 sm:grid-cols-2 sm:p-5">
          <FormField label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Type">
            <select className={selectClass} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {METHOD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Min amount">
            <Input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          </FormField>
          <FormField label="Max amount">
            <Input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
          </FormField>
          <FormField label="Network (optional)">
            <Input value={network} onChange={(e) => setNetwork(e.target.value)} />
          </FormField>
          <FormField label="Instructions" className="sm:col-span-2">
            <Textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </FormField>
          <div className="sm:col-span-2">
            <Button
              type="button"
              size="sm"
              disabled={createMethod.isPending || !name.trim() || !instructions.trim()}
              onClick={() => createMethod.mutate()}
            >
              Add method
            </Button>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Crypto wallet addresses" description="From wallet-addresses admin API." />
        <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
          {addresses.length === 0 ? (
            <li className="py-6 text-caption text-fg-muted">No addresses from API.</li>
          ) : (
            addresses.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-caption">
                <div>
                  <p className="font-medium text-fg">
                    {a.label} · {a.network}
                  </p>
                  <p className="font-mono text-[11px] text-fg-muted">{a.address}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={deleteAddress.isPending}
                  onClick={() => deleteAddress.mutate(a.id)}
                >
                  Delete
                </Button>
              </li>
            ))
          )}
        </ul>
        <div className="grid gap-3 border-t border-white/[0.06] p-4 sm:grid-cols-3 sm:p-5">
          <FormField label="Label">
            <Input value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} />
          </FormField>
          <FormField label="Network">
            <Input value={addrNetwork} onChange={(e) => setAddrNetwork(e.target.value)} />
          </FormField>
          <FormField label="Address">
            <Input value={addrValue} onChange={(e) => setAddrValue(e.target.value)} />
          </FormField>
          <div className="sm:col-span-3">
            <Button
              type="button"
              size="sm"
              disabled={createAddress.isPending || !addrLabel.trim() || !addrValue.trim()}
              onClick={() => createAddress.mutate()}
            >
              Add address
            </Button>
          </div>
        </div>
      </AdminPanel>
    </div>
  )
}
