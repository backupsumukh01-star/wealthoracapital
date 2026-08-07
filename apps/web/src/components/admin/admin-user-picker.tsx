'use client'

import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAdminUsers } from '@/features/admin/hooks'
import { cn } from '@/lib/cn'

type Props = {
  value: string
  onChange: (userId: string) => void
  className?: string
  placeholder?: string
  limit?: number
}

export function AdminUserPicker({
  value,
  onChange,
  className,
  placeholder = 'Search name or email…',
  limit = 20,
}: Props) {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(t)
  }, [q])

  const { data, isLoading } = useAdminUsers({
    q: debouncedQ.length >= 2 ? debouncedQ : undefined,
    page,
    limit,
  })

  const items = data?.items ?? []
  const pagination = data?.pagination
  const totalPages = pagination?.totalPages ?? 1

  return (
    <div className={cn('space-y-2', className)}>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" />
        <Input
          className="border-white/10 bg-white/[0.04] pl-9"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <select
        className="h-10 w-full rounded-lg border border-white/10 bg-inset/60 px-3 text-body-sm text-fg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{isLoading ? 'Loading…' : 'Select investor'}</option>
        {items.map((u) => (
          <option key={u.id} value={u.id}>
            {u.firstName} {u.lastName} · {u.email}
          </option>
        ))}
      </select>
      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-fg-subtle">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
