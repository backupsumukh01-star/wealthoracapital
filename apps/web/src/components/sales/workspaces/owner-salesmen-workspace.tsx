'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { toast } from 'sonner'

import { PageHeader } from '@/components/common/page-header'
import { SalesQueryError } from '@/components/sales/sales-query-state'
import { SalesTemporaryPasswordAlert } from '@/components/sales/sales-temporary-password-alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateSalesman, useOwnerSalesmen } from '@/features/sales/hooks'
import { ApiError } from '@/lib/api-client'

export function OwnerSalesmenWorkspace() {
  const listQuery = useOwnerSalesmen()
  const createSalesman = useCreateSalesman()
  const salesmen = listQuery.data?.salesmen ?? []
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)

  function resetForm() {
    setName('')
    setEmail('')
    setCode('')
  }

  async function onCreate() {
    try {
      const result = await createSalesman.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        ...(code.trim() ? { code: code.trim().toUpperCase() } : {}),
      })
      setTemporaryPassword(result.temporaryPassword ?? null)
      setOpen(false)
      resetForm()
      toast.success(`Created ${result.salesman.code}`)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not create salesman.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salesmen"
        description="Create and inspect Sales Portal accounts. Investor users are not created here."
        actions={
          <Button type="button" onClick={() => setOpen(true)}>
            Create salesman
          </Button>
        }
      />

      {temporaryPassword ? (
        <SalesTemporaryPasswordAlert
          password={temporaryPassword}
          onDismiss={() => setTemporaryPassword(null)}
        />
      ) : null}

      {listQuery.isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {listQuery.isError ? (
        <SalesQueryError error={listQuery.error} onRetry={() => void listQuery.refetch()} />
      ) : null}
      {listQuery.data && salesmen.length === 0 ? (
        <EmptyState
          title="No salesmen"
          description="Create S1–S5 here. Each salesman is a Sales Portal account, not an investor."
        />
      ) : null}
      {salesmen.length > 0 ? (
        <ul className="space-y-3">
          {salesmen.map((row) => (
            <li key={row.id} className="min-w-0">
              <Card padded="md" className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-fg">{row.name}</p>
                    <Badge tone={row.status === 'ACTIVE' ? 'success' : 'danger'} size="sm">
                      {row.status}
                    </Badge>
                  </div>
                  <p className="truncate text-caption text-fg-subtle">{row.email}</p>
                  <p className="text-caption text-fg-muted">Code {row.code}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-caption">
                  <Link className="text-accent hover:underline" href={ROUTES.sales.owner.salesman(row.id)}>
                    Details
                  </Link>
                  <Link
                    className="text-accent hover:underline"
                    href={ROUTES.sales.owner.salesmanNetwork(row.id)}
                  >
                    Network
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create salesman</DialogTitle>
            <DialogDescription>
              A one-time password is generated after save. Codes such as S1–S5 are permanent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Name" required>
              <Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
            </FormField>
            <FormField label="Email" required>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="off"
              />
            </FormField>
            <FormField
              label="Code"
              hint="Optional. Use S1–S5 for the initial team, or leave blank to generate a unique code."
            >
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="S1"
                autoComplete="off"
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void onCreate()}
              disabled={createSalesman.isPending || !name.trim() || !email.trim()}
            >
              {createSalesman.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
