'use client'

import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

import { EmptyState, type EmptyStateProps } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/cn'

export interface DataTableColumn<Row> {
  /** Stable identifier; also the value sent to the API as `sort` when sortable. */
  id: string
  header: ReactNode
  /** Renders the cell. Kept as a function so a column can compose `<Money>` or `<StatusBadge>`. */
  cell: (row: Row) => ReactNode
  /** Right-aligns and applies tabular figures. Use for every money and count column. */
  numeric?: boolean
  sortable?: boolean
  /** Hides the column below `md`, where the card layout takes over. */
  hideOnMobile?: boolean
  width?: string
}

export interface DataTableProps<Row> {
  columns: DataTableColumn<Row>[]
  rows: Row[]
  getRowId: (row: Row) => string
  /** The label shown before the value in the mobile card layout. */
  caption?: string
  loading?: boolean
  skeletonRows?: number
  empty?: EmptyStateProps
  onRowClick?: (row: Row) => void
  sort?: { id: string; direction: 'asc' | 'desc' }
  onSortChange?: (id: string) => void
  pagination?: {
    page: number
    totalPages: number
    total?: number
    onPageChange: (page: number) => void
  }
  className?: string
}

/**
 * The one table in the product.
 *
 * Below `md` it stops being a table and becomes a stack of cards. Horizontally scrolling a
 * financial table on a phone hides the very column the user opened the page for, so the
 * responsive strategy is a layout change rather than an overflow (docs/09 §Responsive).
 *
 * This component holds no data-fetching and no domain knowledge: callers pass rows in and a
 * cell renderer per column.
 */
export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  loading = false,
  skeletonRows = 6,
  empty,
  onRowClick,
  sort,
  onSortChange,
  pagination,
  className,
}: DataTableProps<Row>) {
  const isEmpty = !loading && rows.length === 0

  if (isEmpty && empty) {
    return <EmptyState {...empty} />
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Desktop: a real table, with a sticky header. */}
      <div className="hidden overflow-hidden rounded-lg border border-line md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  numeric={column.numeric}
                  style={column.width ? { width: column.width } : undefined}
                  aria-sort={
                    sort?.id === column.id
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : column.sortable
                        ? 'none'
                        : undefined
                  }
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(column.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded transition-colors hover:text-fg',
                        column.numeric && 'flex-row-reverse',
                      )}
                    >
                      {column.header}
                      <SortIcon active={sort?.id === column.id} direction={sort?.direction} />
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`}>
                    {columns.map((column) => (
                      <TableCell key={column.id} numeric={column.numeric}>
                        <Skeleton className={cn('h-4', column.numeric ? 'ml-auto w-16' : 'w-28')} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow
                    key={getRowId(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(onRowClick && 'cursor-pointer')}
                  >
                    {columns.map((column) => (
                      <TableCell key={column.id} numeric={column.numeric}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: one card per row, label above value. */}
      <div className="space-y-3 md:hidden">
        {loading
          ? Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <div key={`m-skeleton-${rowIndex}`} className="surface-card space-y-3 p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))
          : rows.map((row) => (
              <div
                key={getRowId(row)}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
                className={cn('surface-card p-4', onRowClick && 'cursor-pointer')}
              >
                <dl className="space-y-2.5">
                  {columns.map((column) => (
                    <div key={column.id} className="flex items-baseline justify-between gap-4">
                      <dt className="text-caption shrink-0 text-fg-subtle">{column.header}</dt>
                      <dd className={cn('min-w-0 text-right text-body-sm text-fg')}>
                        {column.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
      </div>

      {pagination ? <Pagination {...pagination} /> : null}
    </div>
  )
}

function SortIcon({ active, direction }: { active: boolean; direction?: 'asc' | 'desc' }) {
  if (!active) return <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
  return direction === 'asc' ? (
    <ArrowUp className="size-3" aria-hidden />
  ) : (
    <ArrowDown className="size-3" aria-hidden />
  )
}
