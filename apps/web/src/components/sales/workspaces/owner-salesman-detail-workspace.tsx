'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { formatMoney, ROUTES, salesReferralUrl } from '@meridian/shared'
import { toast } from 'sonner'

import { PageHeader } from '@/components/common/page-header'
import { SalesCustomerList } from '@/components/sales/sales-customer-list'
import { SalesOwnerSwitcher } from '@/components/sales/sales-owner-shell'
import { SalesEmptyNetwork, SalesQueryError } from '@/components/sales/sales-query-state'
import { SalesSummaryCards, SalesSummarySkeleton } from '@/components/sales/sales-summary-cards'
import { SalesTemporaryPasswordAlert } from '@/components/sales/sales-temporary-password-alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useOwnerNetworkMembers,
  useOwnerNetworkSummary,
  useOwnerSalesmen,
  useResetSalesmanPassword,
  useUpdateSalesman,
} from '@/features/sales/hooks'
import { ApiError } from '@/lib/api-client'
import { env } from '@/lib/env'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

export function OwnerSalesmanDetailWorkspace() {
  const params = useParams<{ salesmanId: string }>()
  const salesmanId = typeof params.salesmanId === 'string' ? params.salesmanId : ''
  const listQuery = useOwnerSalesmen()
  const summaryQuery = useOwnerNetworkSummary(salesmanId || undefined)
  const membersQuery = useOwnerNetworkMembers(salesmanId || undefined)
  const updateSalesman = useUpdateSalesman()
  const resetPassword = useResetSalesmanPassword()
  const salesman = listQuery.data?.salesmen.find((row) => row.id === salesmanId)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const referralLink = salesman
    ? salesman.referralLink ?? salesReferralUrl(env.NEXT_PUBLIC_SITE_URL, salesman.code)
    : ''
  const { copied, copy } = useCopyToClipboard()

  useEffect(() => {
    if (!salesman) return
    setName(salesman.name)
    setEmail(salesman.email)
    setPromoCode(salesman.code)
  }, [salesman])

  async function onSaveProfile() {
    try {
      await updateSalesman.mutateAsync({
        salesmanId,
        body: { name: name.trim(), email: email.trim() },
      })
      toast.success('Salesman profile updated.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not update salesman.')
    }
  }

  async function onSavePromoCode() {
    const nextCode = promoCode.trim().toUpperCase()
    if (!nextCode) {
      toast.error('Promo code is required.')
      return
    }
    if (salesman && nextCode === salesman.code) {
      toast.message('Promo code is unchanged.')
      return
    }
    try {
      await updateSalesman.mutateAsync({
        salesmanId,
        body: { code: nextCode },
      })
      toast.success('Salesman promo code updated.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not update promo code.')
      if (salesman) setPromoCode(salesman.code)
    }
  }

  async function onToggleStatus() {
    if (!salesman) return
    const status = salesman.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    try {
      await updateSalesman.mutateAsync({ salesmanId, body: { status } })
      toast.success(status === 'DISABLED' ? 'Salesman disabled.' : 'Salesman enabled.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not update status.')
    }
  }

  async function onResetPassword() {
    try {
      const result = await resetPassword.mutateAsync(salesmanId)
      setTemporaryPassword(result.temporaryPassword ?? null)
      toast.success('Password reset. Copy the one-time password now.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not reset password.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={ROUTES.sales.owner.salesmen} className="text-accent hover:underline">
            Back to salesmen
          </Link>
        }
        title={salesman?.name ?? summaryQuery.data?.salesman.name ?? 'Salesman'}
        description="Owner management and read-only network reporting for this salesman."
        actions={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto">
            <SalesOwnerSwitcher salesmen={listQuery.data?.salesmen ?? []} currentId={salesmanId} />
            {salesmanId ? (
              <Button asChild variant="secondary">
                <Link href={ROUTES.sales.owner.salesmanNetwork(salesmanId)}>View network tree</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {listQuery.isError ? (
        <SalesQueryError error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : null}

      {temporaryPassword ? (
        <SalesTemporaryPasswordAlert
          password={temporaryPassword}
          onDismiss={() => setTemporaryPassword(null)}
        />
      ) : null}

      {salesman ? (
        <Card padded="md" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-fg">{salesman.name}</p>
            <Badge tone={salesman.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
              {salesman.status}
            </Badge>
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 bg-bg-subtle/40 p-4">
            <FormField
              label="Salesman Promo Code"
              hint="Owner-managed. Changing this updates the referral link for future registrations only."
            >
              <Input
                value={promoCode}
                onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                autoComplete="off"
                spellCheck={false}
                maxLength={16}
              />
            </FormField>
            <div className="min-w-0">
              <p className="text-caption text-fg-subtle">Referral link</p>
              <div className="mt-1 flex min-w-0 items-start gap-2">
                <span className="break-all text-caption text-fg-muted">{referralLink}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => void copy(referralLink)}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => void onSavePromoCode()}
              disabled={
                updateSalesman.isPending ||
                !promoCode.trim() ||
                promoCode.trim().toUpperCase() === salesman.code
              }
            >
              Save promo code
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Name">
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </FormField>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void onSaveProfile()}
              disabled={updateSalesman.isPending || !name.trim() || !email.trim()}
            >
              Save profile
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void onToggleStatus()}
              disabled={updateSalesman.isPending}
            >
              {salesman.status === 'ACTIVE' ? 'Disable' : 'Enable'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void onResetPassword()}
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
            </Button>
          </div>
        </Card>
      ) : listQuery.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : null}

      {summaryQuery.isLoading ? <SalesSummarySkeleton /> : null}
      {summaryQuery.isError ? (
        <SalesQueryError error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />
      ) : null}
      {summaryQuery.data ? (
        <>
          <SalesSummaryCards summary={summaryQuery.data.summary} />
          <Card padded="md">
            <p className="text-caption text-fg-subtle">Total network funds</p>
            <p className="mt-1 text-heading-sm tabular-nums">
              {formatMoney(summaryQuery.data.summary.netFunds)}
            </p>
          </Card>
        </>
      ) : null}

      {membersQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {membersQuery.isError ? (
        <SalesQueryError error={membersQuery.error} onRetry={() => void membersQuery.refetch()} />
      ) : null}
      {membersQuery.data && membersQuery.data.members.length === 0 ? <SalesEmptyNetwork /> : null}
      {membersQuery.data && membersQuery.data.members.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-heading-sm">Network members</h2>
          <SalesCustomerList members={membersQuery.data.members} />
        </section>
      ) : null}
    </div>
  )
}
