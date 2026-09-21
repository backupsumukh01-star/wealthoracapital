'use client'

import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { adminOsId, type CryptoWallet, type InrPaymentMethod } from '@/lib/admin-os-store'
import { useAdminOs } from '@/providers/admin-os-provider'

export function AdminPaymentsOsWorkspace() {
  const {
    state,
    upsertInrMethod,
    upsertCryptoWallet,
    removeCryptoWallet,
    updateGlobal,
  } = useAdminOs()

  function addCrypto() {
    const wallet: CryptoWallet = {
      id: adminOsId('CRYPTO'),
      coin: 'USDT',
      network: 'TRC20',
      address: '',
      qrCodeUrl: '',
      instructions: 'Send only the selected coin/network.',
      enabled: true,
      minDeposit: state.global.minDeposit,
      minWithdrawal: state.global.minWithdrawal,
    }
    upsertCryptoWallet(wallet)
    toast.success('Crypto wallet added')
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Payment Settings"
        description="Bank, UPI, and crypto payout rails."
      />

      <AdminPanel>
        <AdminPanelHeader title="Platform limits" />
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
          {(
            [
              ['minDeposit', 'Minimum deposit'],
              ['maxDeposit', 'Maximum deposit'],
              ['minWithdrawal', 'Minimum withdrawal'],
              ['maxWithdrawal', 'Maximum withdrawal'],
              ['dailyWithdrawalLimit', 'Daily withdrawal limit'],
            ] as const
          ).map(([key, label]) => (
            <FormField key={key} label={label}>
              <Input
                value={state.global[key]}
                onChange={(e) => updateGlobal({ [key]: e.target.value })}
              />
            </FormField>
          ))}
        </div>
        <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5">
          <Button type="button" onClick={() => toast.success('Payment limits saved')}>
            Save limits
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader title="Bank · UPI" description="Enable or edit each rail." />
        <div className="space-y-4 p-4 sm:p-5">
          {state.inrMethods.map((m) => (
            <InrEditor key={m.id} method={m} onSave={upsertInrMethod} />
          ))}
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          title="Crypto wallets"
          description="Add unlimited coin/network addresses."
          action={
            <Button type="button" size="sm" onClick={addCrypto}>
              <Plus aria-hidden />
              Add wallet
            </Button>
          }
        />
        <div className="space-y-4 p-4 sm:p-5">
          {state.cryptoWallets.map((w) => (
            <CryptoEditor
              key={w.id}
              wallet={w}
              onSave={upsertCryptoWallet}
              onRemove={() => {
                removeCryptoWallet(w.id)
                toast.message('Wallet removed')
              }}
            />
          ))}
        </div>
      </AdminPanel>
    </div>
  )
}

function InrEditor({
  method,
  onSave,
}: {
  method: InrPaymentMethod
  onSave: (m: InrPaymentMethod) => void
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-inset/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-medium text-fg">
          {method.label} · {method.type}
        </p>
        <Button
          type="button"
          size="sm"
          variant="glass"
          onClick={() => {
            onSave({ ...method, enabled: !method.enabled })
            toast.message(method.enabled ? 'Disabled' : 'Enabled')
          }}
        >
          {method.enabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {method.type === 'BANK' ? (
          <>
            <FormField label="Bank name">
              <Input
                value={method.bankName ?? ''}
                onChange={(e) => onSave({ ...method, bankName: e.target.value })}
              />
            </FormField>
            <FormField label="Account holder">
              <Input
                value={method.accountHolder ?? ''}
                onChange={(e) => onSave({ ...method, accountHolder: e.target.value })}
              />
            </FormField>
            <FormField label="Account number">
              <Input
                value={method.accountNumber ?? ''}
                onChange={(e) => onSave({ ...method, accountNumber: e.target.value })}
              />
            </FormField>
            <FormField label="IFSC">
              <Input
                value={method.ifsc ?? ''}
                onChange={(e) => onSave({ ...method, ifsc: e.target.value })}
              />
            </FormField>
          </>
        ) : (
          <FormField label="UPI ID">
            <Input
              value={method.upiId ?? ''}
              onChange={(e) => onSave({ ...method, upiId: e.target.value })}
            />
          </FormField>
        )}
        <FormField label="QR code URL">
          <Input
            value={method.qrCodeUrl}
            onChange={(e) => onSave({ ...method, qrCodeUrl: e.target.value })}
          />
        </FormField>
        <FormField label="Instructions" className="sm:col-span-2">
          <Textarea
            value={method.instructions}
            onChange={(e) => onSave({ ...method, instructions: e.target.value })}
            rows={2}
          />
        </FormField>
      </div>
    </div>
  )
}

function CryptoEditor({
  wallet,
  onSave,
  onRemove,
}: {
  wallet: CryptoWallet
  onSave: (w: CryptoWallet) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-inset/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-medium text-fg">
          {wallet.coin} · {wallet.network}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="glass"
            onClick={() => onSave({ ...wallet, enabled: !wallet.enabled })}
          >
            {wallet.enabled ? 'Enabled' : 'Disabled'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Coin">
          <Input value={wallet.coin} onChange={(e) => onSave({ ...wallet, coin: e.target.value })} />
        </FormField>
        <FormField label="Network">
          <Input
            value={wallet.network}
            onChange={(e) => onSave({ ...wallet, network: e.target.value })}
          />
        </FormField>
        <FormField label="Wallet address" className="sm:col-span-2">
          <Input
            value={wallet.address}
            onChange={(e) => onSave({ ...wallet, address: e.target.value })}
          />
        </FormField>
        <FormField label="QR code URL">
          <Input
            value={wallet.qrCodeUrl}
            onChange={(e) => onSave({ ...wallet, qrCodeUrl: e.target.value })}
          />
        </FormField>
        <FormField label="Min deposit">
          <Input
            value={wallet.minDeposit}
            onChange={(e) => onSave({ ...wallet, minDeposit: e.target.value })}
          />
        </FormField>
        <FormField label="Instructions" className="sm:col-span-2">
          <Textarea
            value={wallet.instructions}
            onChange={(e) => onSave({ ...wallet, instructions: e.target.value })}
            rows={2}
          />
        </FormField>
      </div>
    </div>
  )
}
