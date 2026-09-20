'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatMoney } from '@meridian/shared'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import type { SalesNetworkMember } from '@/features/sales/types'
import { cn } from '@/lib/cn'

type RelationFilter = 'all' | 'direct' | 'indirect'

export function SalesCustomerList({
  members,
  hrefFor,
}: {
  members: SalesNetworkMember[]
  hrefFor?: (userId: string) => string
}) {
  const [query, setQuery] = useState('')
  const [relation, setRelation] = useState<RelationFilter>('all')
  const [level, setLevel] = useState<string>('all')

  const levels = useMemo(() => {
    const unique = [...new Set(members.map((member) => member.level))].sort((a, b) => a - b)
    return unique
  }, [members])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return members.filter((member) => {
      if (relation === 'direct' && !member.isDirect) return false
      if (relation === 'indirect' && member.isDirect) return false
      if (level !== 'all' && member.level !== Number(level)) return false
      if (!needle) return true
      return (
        member.name.toLowerCase().includes(needle) ||
        member.username.toLowerCase().includes(needle)
      )
    })
  }, [level, members, query, relation])

  return (
    <div className="space-y-4">
      <div className="flex min-w-0 flex-col gap-3">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or username"
          aria-label="Search customers"
        />
        <div className="flex min-w-0 flex-wrap gap-2">
          {(
            [
              ['all', 'All'],
              ['direct', 'Direct'],
              ['indirect', 'Indirect'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRelation(value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-caption',
                relation === value
                  ? 'border-accent bg-accent/10 text-fg'
                  : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
              )}
            >
              {label}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-caption text-fg-subtle">
            Level
            <select
              className="h-10 rounded-xl border border-line-default bg-inset/80 px-3 text-fg"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option value="all">All</option>
              {levels.map((value) => (
                <option key={value} value={String(value)}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          variant="filtered"
          title="No customers match these filters"
          description="Clear search or filters to see the full network list."
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((member) => {
            const body = (
              <>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-body-sm font-medium text-fg">{member.name}</p>
                  <Badge tone={member.isDirect ? 'accent' : 'neutral'} size="sm">
                    {member.isDirect ? 'Direct' : 'Indirect'}
                  </Badge>
                  <Badge tone="outline" size="sm">
                    Level {member.level}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-caption text-fg-subtle">@{member.username}</p>
                {member.parentName ? (
                  <p className="truncate text-caption text-fg-muted">Parent {member.parentName}</p>
                ) : null}
                <p className="text-caption text-fg-muted">
                  referred {member.directReferralCount} · network {member.networkMemberCount}
                </p>
                <dl className="mt-3 grid grid-cols-1 gap-1 text-caption sm:grid-cols-4">
                  <div>
                    <dt className="text-fg-subtle">Balance</dt>
                    <dd className="tabular-nums">{formatMoney(member.currentBalance)}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Deposits</dt>
                    <dd className="tabular-nums">{formatMoney(member.approvedDeposits)}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Withdrawals</dt>
                    <dd className="tabular-nums">{formatMoney(member.paidWithdrawals)}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Net funds</dt>
                    <dd className="tabular-nums">{formatMoney(member.netFunds)}</dd>
                  </div>
                </dl>
              </>
            )
            return (
              <li key={member.userId} className="min-w-0">
                {hrefFor ? (
                  <Link href={hrefFor(member.userId)} className="block min-w-0">
                    <Card padded="md" interactive className="h-full">
                      {body}
                    </Card>
                  </Link>
                ) : (
                  <Card padded="md" className="h-full">
                    {body}
                  </Card>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
