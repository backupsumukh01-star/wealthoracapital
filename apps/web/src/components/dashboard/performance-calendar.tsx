'use client'

import { SectionHeader } from '@/components/common/page-header'
import { Card } from '@/components/ui/card'
import { PERFORMANCE_CALENDAR, type CalendarDayStatus } from '@/lib/dashboard-data'
import { cn } from '@/lib/cn'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function statusClass(status: CalendarDayStatus) {
  switch (status) {
    case 'profit':
      return 'bg-profit/20 text-profit border-profit/30 hover:bg-profit/30'
    case 'loss':
      return 'bg-loss/20 text-loss border-loss/30 hover:bg-loss/30'
    case 'none':
      return 'bg-hover/60 text-fg-subtle border-line'
    default:
      return 'bg-transparent border-transparent text-transparent'
  }
}

export function PerformanceCalendar() {
  const { year, month, days, monthLabel } = PERFORMANCE_CALENDAR

  // JS: Sunday = 0. Shift so Monday is first column.
  const firstWeekday = new Date(year, month, 1).getDay()
  const mondayOffset = (firstWeekday + 6) % 7
  const blanks = Array.from({ length: mondayOffset }, (_, i) => i)

  return (
    <Card variant="glass" padded="md" className="h-full">
      <SectionHeader
        title="Performance calendar"
        description={monthLabel}
        as="h3"
      />

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-fg-subtle"
          >
            {day}
          </div>
        ))}

        {blanks.map((i) => (
          <div key={`blank-${i}`} className="aspect-square" aria-hidden />
        ))}

        {days.map((day) => {
          const label =
            day.status === 'profit'
              ? `Profit day ${day.day}${day.returnPct ? `, +${day.returnPct}%` : ''}`
              : day.status === 'loss'
                ? `Loss day ${day.day}${day.returnPct ? `, ${day.returnPct}%` : ''}`
                : day.status === 'none'
                  ? `No trading on day ${day.day}`
                  : `Day ${day.day}`

          return (
            <div
              key={day.day}
              title={day.returnPct ? `${day.returnPct}%` : undefined}
              aria-label={label}
              className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-md border text-[11px] font-medium tabular-nums transition-colors',
                statusClass(day.status),
              )}
            >
              <span>{day.day}</span>
              {day.returnPct ? (
                <span className="hidden text-[9px] opacity-80 sm:block">
                  {Number(day.returnPct) > 0 ? '+' : ''}
                  {day.returnPct}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-4 text-caption text-fg-muted">
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-profit/50" aria-hidden />
          Profit
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-loss/50" aria-hidden />
          Loss
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 rounded-sm bg-hover" aria-hidden />
          No trading
        </li>
      </ul>
    </Card>
  )
}
