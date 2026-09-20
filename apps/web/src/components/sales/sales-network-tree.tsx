'use client'

import { useState } from 'react'
import { buildSalesNetworkForest, formatMoney } from '@meridian/shared'
import { ChevronDown, ChevronRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { SalesNetworkMember, SalesNetworkSalesman } from '@/features/sales/types'
import { cn } from '@/lib/cn'

function NodeCard({
  member,
  depth,
  expanded,
  onToggle,
  hasChildren,
}: {
  member: SalesNetworkMember & { children: unknown[] }
  depth: number
  expanded: boolean
  onToggle: () => void
  hasChildren: boolean
}) {
  const indent = Math.min(depth, 4)

  return (
    <div
      className="min-w-0"
      style={{ paddingLeft: indent === 0 ? undefined : `${indent * 0.75}rem` }}
    >
      <Card padded="none" className="overflow-hidden">
        <div className="flex min-w-0 items-start gap-2 p-3 sm:p-4">
          {hasChildren ? (
            <button
              type="button"
              onClick={onToggle}
              className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-hover hover:text-fg"
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? (
                <ChevronDown className="size-4" aria-hidden />
              ) : (
                <ChevronRight className="size-4" aria-hidden />
              )}
            </button>
          ) : (
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center text-fg-subtle" aria-hidden>
              ·
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate text-body-sm font-medium text-fg">{member.name}</p>
              <Badge tone={member.isDirect ? 'accent' : 'neutral'} size="sm">
                {member.isDirect ? 'Direct' : 'Indirect'}
              </Badge>
              <Badge tone="outline" size="sm">
                Level {member.level}
              </Badge>
            </div>
            <p className="truncate text-caption text-fg-subtle">@{member.username}</p>
            {member.parentName ? (
              <p className="truncate text-caption text-fg-muted">Parent {member.parentName}</p>
            ) : null}
            <p className="text-caption text-fg-muted">
              referred {member.directReferralCount} · network {member.networkMemberCount}
            </p>
            <dl className="grid grid-cols-1 gap-1 text-caption sm:grid-cols-3">
              <div className="min-w-0">
                <dt className="text-fg-subtle">Approved deposits</dt>
                <dd className="tabular-nums text-fg">{formatMoney(member.approvedDeposits)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-fg-subtle">Paid withdrawals</dt>
                <dd className="tabular-nums text-fg">{formatMoney(member.paidWithdrawals)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-fg-subtle">Net funds</dt>
                <dd className="tabular-nums text-fg">{formatMoney(member.netFunds)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>
    </div>
  )
}

function TreeBranch({
  node,
  depth,
  expanded,
  setExpanded,
}: {
  node: ReturnType<typeof buildSalesNetworkForest<SalesNetworkMember>>[number]
  depth: number
  expanded: Set<string>
  setExpanded: (next: Set<string>) => void
}) {
  const isOpen = expanded.has(node.userId)
  const hasChildren = node.children.length > 0

  return (
    <li className="space-y-2">
      <NodeCard
        member={node}
        depth={depth}
        expanded={isOpen}
        hasChildren={hasChildren}
        onToggle={() => {
          const next = new Set(expanded)
          if (next.has(node.userId)) next.delete(node.userId)
          else next.add(node.userId)
          setExpanded(next)
        }}
      />
      {hasChildren && isOpen ? (
        <ul className={cn('space-y-2 border-l border-line-default/80', depth >= 4 ? 'ml-3' : 'ml-4 sm:ml-6')}>
          {node.children.map((child) => (
            <TreeBranch
              key={child.userId}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              setExpanded={setExpanded}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function SalesNetworkTree({
  salesman,
  members,
}: {
  salesman: SalesNetworkSalesman
  members: SalesNetworkMember[]
}) {
  const forest = buildSalesNetworkForest(members)
  const defaultOpen = new Set(
    members.filter((member) => member.level <= 1).map((member) => member.userId),
  )
  const [expanded, setExpanded] = useState<Set<string>>(defaultOpen)

  return (
    <div className="min-w-0 space-y-3">
      <Card padded="md" variant="glass">
        <p className="text-caption text-fg-subtle">Salesman</p>
        <p className="mt-1 text-heading-sm text-fg">
          {salesman.code}
          <span className="text-fg-muted"> · {salesman.name}</span>
        </p>
      </Card>
      <ul className="space-y-2">
        {forest.map((node) => (
          <TreeBranch
            key={node.userId}
            node={node}
            depth={0}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        ))}
      </ul>
    </div>
  )
}
