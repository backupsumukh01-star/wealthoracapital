'use client'

/**
 * Admin Deposit Methods — normalized UPI / Bank / Crypto / Manual rails with investor preview.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DEPOSIT_CRYPTO_COINS,
  DEPOSIT_CRYPTO_NETWORKS,
  DEPOSIT_METHOD_TYPES,
  type DepositCryptoCoin,
  type PaymentMethod,
} from '@meridian/shared'
import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { DepositMethodCard } from '@/components/deposits/deposit-method-card'
import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { adminService } from '@/services/admin.service'
import { mediaService } from '@/services/media.service'

const selectClass =
  'h-10 w-full rounded-lg border border-white/10 bg-inset/60 px-3 text-body-sm text-fg'

type WalletDraft = {
  key: string
  id?: string
  label: string
  coin: string
  network: string
  address: string
  instructions: string
  qrCodeKey: string | null
  qrCodeUrl: string | null
  minAmount: string
  maxAmount: string
  isActive: boolean
}

type FormState = {
  name: string
  type: (typeof DEPOSIT_METHOD_TYPES)[number]
  instructions: string
  minAmount: string
  maxAmount: string
  processingTime: string
  logoKey: string | null
  logoUrl: string | null
  isActive: boolean
  upiId: string
  upiHolder: string
  upiQrKey: string | null
  upiQrUrl: string | null
  bankHolder: string
  bankName: string
  accountNumber: string
  ifsc: string
  branch: string
  accountType: string
  bankQrKey: string | null
  bankQrUrl: string | null
  wallets: WalletDraft[]
}

function emptyForm(): FormState {
  return {
    name: '',
    type: 'UPI',
    instructions: '',
    minAmount: '1',
    maxAmount: '100000',
    processingTime: '1–24 hours',
    logoKey: null,
    logoUrl: null,
    isActive: true,
    upiId: '',
    upiHolder: '',
    upiQrKey: null,
    upiQrUrl: null,
    bankHolder: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    branch: '',
    accountType: 'SAVINGS',
    bankQrKey: null,
    bankQrUrl: null,
    wallets: [
      {
        key: crypto.randomUUID(),
        label: 'Wallet 1',
        coin: 'USDT',
        network: 'TRC20',
        address: '',
        instructions: '',
        qrCodeKey: null,
        qrCodeUrl: null,
        minAmount: '',
        maxAmount: '',
        isActive: true,
      },
    ],
  }
}

function formFromMethod(m: PaymentMethod): FormState {
  return {
    name: m.name,
    type: (DEPOSIT_METHOD_TYPES.includes(m.type as (typeof DEPOSIT_METHOD_TYPES)[number])
      ? m.type
      : m.type === 'MOBILE_WALLET'
        ? 'UPI'
        : 'CRYPTO') as FormState['type'],
    instructions: m.instructions,
    minAmount: m.minAmount,
    maxAmount: m.maxAmount ?? '',
    processingTime: m.processingTime ?? '',
    logoKey: m.logoKey,
    logoUrl: m.logoUrl,
    isActive: m.isActive,
    upiId: m.upi?.upiId ?? '',
    upiHolder: m.upi?.accountHolderName ?? '',
    upiQrKey: m.upi?.qrCodeKey ?? null,
    upiQrUrl: m.upi?.qrCodeUrl ?? null,
    bankHolder: m.bank?.accountHolderName ?? '',
    bankName: m.bank?.bankName ?? '',
    accountNumber: m.bank?.accountNumber ?? '',
    ifsc: m.bank?.ifscCode ?? '',
    branch: m.bank?.branch ?? '',
    accountType: m.bank?.accountType ?? 'SAVINGS',
    bankQrKey: m.bank?.qrCodeKey ?? null,
    bankQrUrl: m.bank?.qrCodeUrl ?? null,
    wallets:
      m.cryptoWallets?.length > 0
        ? m.cryptoWallets.map((w) => ({
            key: w.id,
            id: w.id,
            label: w.label,
            coin: w.coin,
            network: w.network,
            address: w.address,
            instructions: w.instructions ?? '',
            qrCodeKey: w.qrCodeKey,
            qrCodeUrl: w.qrCodeUrl,
            minAmount: w.minAmount ?? '',
            maxAmount: w.maxAmount ?? '',
            isActive: w.isActive,
          }))
        : emptyForm().wallets,
  }
}

function previewFromForm(form: FormState, id = 'preview'): PaymentMethod {
  return {
    id,
    name: form.name || 'Untitled method',
    type: form.type,
    instructions: form.instructions,
    accountDetails: {},
    minAmount: form.minAmount || '0',
    maxAmount: form.maxAmount || null,
    processingTime: form.processingTime || null,
    priority: 100,
    isActive: form.isActive,
    logoKey: form.logoKey,
    logoUrl: form.logoUrl,
    network: null,
    feePct: '0',
    upi:
      form.type === 'UPI'
        ? {
            upiId: form.upiId,
            accountHolderName: form.upiHolder,
            qrCodeKey: form.upiQrKey,
            qrCodeUrl: form.upiQrUrl,
          }
        : null,
    bank:
      form.type === 'BANK_TRANSFER'
        ? {
            accountHolderName: form.bankHolder,
            bankName: form.bankName,
            accountNumber: form.accountNumber,
            ifscCode: form.ifsc,
            branch: form.branch || null,
            accountType: form.accountType || null,
            qrCodeKey: form.bankQrKey,
            qrCodeUrl: form.bankQrUrl,
          }
        : null,
    cryptoWallets:
      form.type === 'CRYPTO'
        ? form.wallets
            .filter((w) => w.isActive && w.address.trim())
            .map((w) => ({
              id: w.id ?? w.key,
              paymentMethodId: id,
              label: w.label,
              coin: w.coin,
              network: w.network,
              address: w.address,
              memo: null,
              instructions: w.instructions || null,
              qrCodeKey: w.qrCodeKey,
              qrCodeUrl: w.qrCodeUrl,
              minAmount: w.minAmount || null,
              maxAmount: w.maxAmount || null,
              sortOrder: 100,
              isDefault: false,
              isActive: w.isActive,
            }))
        : [],
  }
}

function buildPayload(form: FormState) {
  const base = {
    name: form.name.trim(),
    type: form.type,
    instructions: form.instructions.trim(),
    minAmount: form.minAmount,
    maxAmount: form.maxAmount || null,
    processingTime: form.processingTime.trim() || null,
    logoKey: form.logoKey,
    isActive: form.isActive,
  }
  if (form.type === 'UPI') {
    return {
      ...base,
      upi: {
        upiId: form.upiId.trim(),
        accountHolderName: form.upiHolder.trim(),
        qrCodeKey: form.upiQrKey,
      },
    }
  }
  if (form.type === 'BANK_TRANSFER') {
    return {
      ...base,
      bank: {
        accountHolderName: form.bankHolder.trim(),
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        ifscCode: form.ifsc.trim(),
        branch: form.branch.trim() || null,
        accountType: form.accountType.trim() || null,
        qrCodeKey: form.bankQrKey,
      },
    }
  }
  if (form.type === 'CRYPTO') {
    return {
      ...base,
      cryptoWallets: form.wallets.map((w, index) => ({
        ...(w.id ? { id: w.id } : {}),
        label: w.label.trim(),
        coin: w.coin,
        network: w.network,
        address: w.address.trim(),
        instructions: w.instructions.trim() || null,
        qrCodeKey: w.qrCodeKey,
        minAmount: w.minAmount || null,
        maxAmount: w.maxAmount || null,
        sortOrder: (index + 1) * 10,
        isActive: w.isActive,
        isDefault: index === 0,
      })),
    }
  }
  return base
}

async function uploadQr(file: File): Promise<{ key: string; url: string }> {
  const asset = await mediaService.upload(file, 'deposit-methods')
  return { key: asset.key, url: asset.url }
}

export function AdminPaymentMethodsWorkspace() {
  const qc = useQueryClient()
  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['admin', 'payment-methods'],
    queryFn: () => adminService.paymentMethods(),
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [showForm, setShowForm] = useState(false)

  const preview = useMemo(() => previewFromForm(form, editingId ?? 'preview'), [form, editingId])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'payment-methods'] })

  const save = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form)
      if (editingId) return adminService.updatePaymentMethod(editingId, payload)
      return adminService.createPaymentMethod(payload)
    },
    onSuccess: () => {
      invalidate()
      toast.success(editingId ? 'Method updated' : 'Method created')
      setShowForm(false)
      setEditingId(null)
      setForm(emptyForm())
    },
    onError: (err: Error) => toast.error(err.message || 'Save failed'),
  })

  const toggle = useMutation({
    mutationFn: (m: PaymentMethod) =>
      adminService.updatePaymentMethod(m.id, { isActive: !m.isActive }),
    onSuccess: () => {
      invalidate()
      toast.success('Status updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Update failed'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => adminService.deletePaymentMethod(id),
    onSuccess: () => {
      invalidate()
      toast.success('Method deleted')
    },
    onError: (err: Error) => toast.error(err.message || 'Delete failed'),
  })

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => adminService.reorderPaymentMethods(orderedIds),
    onSuccess: () => {
      invalidate()
      toast.success('Order saved')
    },
    onError: (err: Error) => toast.error(err.message || 'Reorder failed'),
  })

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(m: PaymentMethod) {
    setEditingId(m.id)
    setForm(formFromMethod(m))
    setShowForm(true)
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir
    if (next < 0 || next >= methods.length) return
    const ids = methods.map((m) => m.id)
    ;[ids[index], ids[next]] = [ids[next]!, ids[index]!]
    reorder.mutate(ids)
  }

  async function onUpload(
    file: File | undefined,
    apply: (key: string, url: string) => void,
  ) {
    if (!file) return
    try {
      const { key, url } = await uploadQr(file)
      apply(key, url)
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Deposit methods"
        description="Configure UPI, bank transfer, crypto wallets, and manual rails. Investors only see enabled methods."
        actions={
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden />
            Add method
          </Button>
        }
      />

      <AdminPanel>
        <AdminPanelHeader
          title="Methods"
          description={isLoading ? 'Loading…' : `${methods.length} configured`}
        />
        <ul className="divide-y divide-white/[0.05] px-4 sm:px-5">
          {methods.length === 0 && !isLoading ? (
            <li className="py-8 text-center text-caption text-fg-muted">
              No deposit methods yet. Create UPI, bank, crypto, or manual rails.
            </li>
          ) : (
            methods.map((m, index) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5 text-caption"
              >
                <div className="min-w-0">
                  <p className="font-medium text-fg">
                    {m.name}{' '}
                    <span className="text-fg-subtle">· {m.type.replaceAll('_', ' ')}</span>
                  </p>
                  <p className="text-fg-muted">
                    {m.minAmount}–{m.maxAmount ?? '∞'} · priority {m.priority} ·{' '}
                    {m.isActive ? 'Enabled' : 'Disabled'}
                    {m.type === 'CRYPTO' ? ` · ${m.cryptoWallets?.length ?? 0} wallet(s)` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={reorder.isPending || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={reorder.isPending || index === methods.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(m)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate(m)}
                  >
                    {m.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete ${m.name}?`)) remove.mutate(m.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))
          )}
        </ul>
      </AdminPanel>

      {showForm ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <AdminPanel>
            <AdminPanelHeader
              title={editingId ? 'Edit method' : 'Create method'}
              description="Fields change by payment type."
            />
            <div className="grid gap-3 p-4 sm:p-5">
              <FormField label="Name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </FormField>
              <FormField label="Type">
                <select
                  className={selectClass}
                  value={form.type}
                  disabled={Boolean(editingId)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as FormState['type'],
                    }))
                  }
                >
                  {DEPOSIT_METHOD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Minimum deposit">
                  <Input
                    value={form.minAmount}
                    onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))}
                  />
                </FormField>
                <FormField label="Maximum deposit">
                  <Input
                    value={form.maxAmount}
                    onChange={(e) => setForm((f) => ({ ...f, maxAmount: e.target.value }))}
                  />
                </FormField>
              </div>
              <FormField label="Estimated processing time">
                <Input
                  value={form.processingTime}
                  onChange={(e) => setForm((f) => ({ ...f, processingTime: e.target.value }))}
                  placeholder="e.g. Instant · 1–24 hours"
                />
              </FormField>
              <FormField label="Instructions">
                <Textarea
                  rows={3}
                  value={form.instructions}
                  onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                />
              </FormField>
              <FormField label="Logo (optional)">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    void onUpload(e.target.files?.[0], (key, url) =>
                      setForm((f) => ({ ...f, logoKey: key, logoUrl: url })),
                    )
                  }
                />
              </FormField>
              <label className="flex items-center gap-2 text-caption text-fg-muted">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Enabled for investors
              </label>

              {form.type === 'UPI' ? (
                <div className="mt-2 space-y-3 rounded-lg border border-white/10 p-3">
                  <p className="text-caption font-medium text-fg">UPI details</p>
                  <FormField label="UPI ID">
                    <Input
                      value={form.upiId}
                      onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Account holder name">
                    <Input
                      value={form.upiHolder}
                      onChange={(e) => setForm((f) => ({ ...f, upiHolder: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="QR code">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        void onUpload(e.target.files?.[0], (key, url) =>
                          setForm((f) => ({ ...f, upiQrKey: key, upiQrUrl: url })),
                        )
                      }
                    />
                  </FormField>
                </div>
              ) : null}

              {form.type === 'BANK_TRANSFER' ? (
                <div className="mt-2 space-y-3 rounded-lg border border-white/10 p-3">
                  <p className="text-caption font-medium text-fg">Bank details</p>
                  <FormField label="Account holder name">
                    <Input
                      value={form.bankHolder}
                      onChange={(e) => setForm((f) => ({ ...f, bankHolder: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Bank name">
                    <Input
                      value={form.bankName}
                      onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="Account number">
                    <Input
                      value={form.accountNumber}
                      onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                    />
                  </FormField>
                  <FormField label="IFSC code">
                    <Input
                      value={form.ifsc}
                      onChange={(e) => setForm((f) => ({ ...f, ifsc: e.target.value }))}
                    />
                  </FormField>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Branch">
                      <Input
                        value={form.branch}
                        onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
                      />
                    </FormField>
                    <FormField label="Account type">
                      <select
                        className={selectClass}
                        value={form.accountType}
                        onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value }))}
                      >
                        <option value="SAVINGS">Savings</option>
                        <option value="CURRENT">Current</option>
                      </select>
                    </FormField>
                  </div>
                  <FormField label="QR code (optional)">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        void onUpload(e.target.files?.[0], (key, url) =>
                          setForm((f) => ({ ...f, bankQrKey: key, bankQrUrl: url })),
                        )
                      }
                    />
                  </FormField>
                </div>
              ) : null}

              {form.type === 'CRYPTO' ? (
                <div className="mt-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-caption font-medium text-fg">Crypto wallets</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          wallets: [
                            ...f.wallets,
                            {
                              key: crypto.randomUUID(),
                              label: `Wallet ${f.wallets.length + 1}`,
                              coin: 'USDT',
                              network: 'TRC20',
                              address: '',
                              instructions: '',
                              qrCodeKey: null,
                              qrCodeUrl: null,
                              minAmount: '',
                              maxAmount: '',
                              isActive: true,
                            },
                          ],
                        }))
                      }
                    >
                      Add wallet
                    </Button>
                  </div>
                  {form.wallets.map((wallet, wi) => {
                    const coin = (DEPOSIT_CRYPTO_COINS.includes(wallet.coin as DepositCryptoCoin)
                      ? wallet.coin
                      : 'USDT') as DepositCryptoCoin
                    const networks = DEPOSIT_CRYPTO_NETWORKS[coin] ?? ['TRC20']
                    return (
                      <div key={wallet.key} className="space-y-3 rounded-lg border border-white/10 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-caption text-fg-muted">Wallet {wi + 1}</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={form.wallets.length <= 1}
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                wallets: f.wallets.filter((w) => w.key !== wallet.key),
                              }))
                            }
                          >
                            Remove
                          </Button>
                        </div>
                        <FormField label="Label">
                          <Input
                            value={wallet.label}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                wallets: f.wallets.map((w) =>
                                  w.key === wallet.key ? { ...w, label: e.target.value } : w,
                                ),
                              }))
                            }
                          />
                        </FormField>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FormField label="Coin">
                            <select
                              className={selectClass}
                              value={wallet.coin}
                              onChange={(e) => {
                                const nextCoin = e.target.value as DepositCryptoCoin
                                const nextNetworks = DEPOSIT_CRYPTO_NETWORKS[nextCoin] ?? ['TRC20']
                                setForm((f) => ({
                                  ...f,
                                  wallets: f.wallets.map((w) =>
                                    w.key === wallet.key
                                      ? {
                                          ...w,
                                          coin: nextCoin,
                                          network: nextNetworks[0] ?? w.network,
                                        }
                                      : w,
                                  ),
                                }))
                              }}
                            >
                              {DEPOSIT_CRYPTO_COINS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </FormField>
                          <FormField label="Network">
                            <select
                              className={selectClass}
                              value={wallet.network}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  wallets: f.wallets.map((w) =>
                                    w.key === wallet.key ? { ...w, network: e.target.value } : w,
                                  ),
                                }))
                              }
                            >
                              {networks.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </FormField>
                        </div>
                        <FormField label="Wallet address">
                          <Input
                            value={wallet.address}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                wallets: f.wallets.map((w) =>
                                  w.key === wallet.key ? { ...w, address: e.target.value } : w,
                                ),
                              }))
                            }
                          />
                        </FormField>
                        <FormField label="Instructions (optional)">
                          <Textarea
                            rows={2}
                            value={wallet.instructions}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                wallets: f.wallets.map((w) =>
                                  w.key === wallet.key
                                    ? { ...w, instructions: e.target.value }
                                    : w,
                                ),
                              }))
                            }
                          />
                        </FormField>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FormField label="Min (optional)">
                            <Input
                              value={wallet.minAmount}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  wallets: f.wallets.map((w) =>
                                    w.key === wallet.key
                                      ? { ...w, minAmount: e.target.value }
                                      : w,
                                  ),
                                }))
                              }
                            />
                          </FormField>
                          <FormField label="Max (optional)">
                            <Input
                              value={wallet.maxAmount}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  wallets: f.wallets.map((w) =>
                                    w.key === wallet.key
                                      ? { ...w, maxAmount: e.target.value }
                                      : w,
                                  ),
                                }))
                              }
                            />
                          </FormField>
                        </div>
                        <FormField label="QR code">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              void onUpload(e.target.files?.[0], (key, url) =>
                                setForm((f) => ({
                                  ...f,
                                  wallets: f.wallets.map((w) =>
                                    w.key === wallet.key
                                      ? { ...w, qrCodeKey: key, qrCodeUrl: url }
                                      : w,
                                  ),
                                })),
                              )
                            }
                          />
                        </FormField>
                        <label className="flex items-center gap-2 text-caption text-fg-muted">
                          <input
                            type="checkbox"
                            checked={wallet.isActive}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                wallets: f.wallets.map((w) =>
                                  w.key === wallet.key
                                    ? { ...w, isActive: e.target.checked }
                                    : w,
                                ),
                              }))
                            }
                          />
                          Enabled
                        </label>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={save.isPending || !form.name.trim() || !form.instructions.trim()}
                  onClick={() => save.mutate()}
                >
                  {editingId ? 'Save changes' : 'Create method'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader
              title="Investor preview"
              description="Exact card investors see when this method is enabled."
            />
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-1.5 text-caption text-fg-subtle">
                <Eye className="h-3.5 w-3.5" aria-hidden />
                Live preview
              </div>
              <DepositMethodCard method={preview} />
            </div>
          </AdminPanel>
        </div>
      ) : null}
    </div>
  )
}
