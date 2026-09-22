'use client'

import { formatDecimal, formatPercent } from '@meridian/shared'

import {
  DAILY_COVERS,
  DAILY_POSTERS,
  DAILY_SLOTS,
  POSTER_SIZE,
  type OverlaySlot,
} from './overlay-layout'
import type { ProgressShareInput } from './types'

export const PROTOTYPE_CANVAS = POSTER_SIZE

/** Matches filled Today’s Earnings artwork. */

const FONT = 'Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif'

function posterDate(value: string): string {
  const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!iso) return value.trim().toUpperCase()
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return `${iso[3]} ${months[Number(iso[2]) - 1]} ${iso[1]}`
}

function money(value: string): string {
  return `$${formatDecimal(value.replace(/[^0-9.-]/g, '') || '0', 2)}`
}

function amount(value: string): string {
  return formatDecimal(value.replace(/[^0-9.-]/g, '') || '0', 2)
}

function Field({
  slot,
  id,
  children,
}: {
  slot: OverlaySlot
  id: string
  children: string
}) {
  const gradient = slot.gradient
  return (
    <div
      id={id}
      style={{
        position: 'absolute',
        left: slot.x,
        top: slot.y,
        fontSize: slot.size,
        fontWeight: slot.weight,
        letterSpacing: slot.tracking ?? '-0.03em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        fontFamily: FONT,
        ...(gradient
          ? {
              color: 'transparent',
              backgroundImage: `linear-gradient(90deg, ${gradient.from} 0%, ${gradient.mid} 42%, ${gradient.to} 100%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              filter:
                'drop-shadow(0 0 18px rgba(80,220,170,0.55)) drop-shadow(0 10px 28px rgba(46,212,140,0.28))',
            }
          : {
              color: slot.color,
              textShadow: slot.shadow,
            }),
      }}
    >
      {children}
    </div>
  )
}

function Guide({ slot, label }: { slot: OverlaySlot; label: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: slot.x - 6,
        top: slot.y - 6,
        minWidth: 160,
        minHeight: slot.size + 12,
        border: '1px dashed rgba(255,80,80,0.85)',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: -18,
          left: 0,
          fontSize: 14,
          color: '#FF8A8A',
          fontWeight: 600,
        }}
      >
        {label} ({slot.x},{slot.y})
      </span>
    </div>
  )
}

export function ProgressSharePrototypeCanvas({
  data,
  poster = 'a',
  showGuides = false,
}: {
  data: ProgressShareInput
  poster?: 'a' | 'b'
  showGuides?: boolean
}) {
  const src = DAILY_POSTERS[poster]
  const daily = data.type === 'daily'
  const name = data.investorName
  const earned = daily ? money(data.todayEarnings) : money(data.totalEarnings)
  const ret = daily
    ? formatPercent(data.dailyReturn.replace('%', ''), { decimals: 2, signed: true })
    : formatPercent(data.performance.replace('%', ''), { decimals: 2, signed: true })
  const total = amount(data.totalEarnings)
  const balance = 'currentValue' in data ? money(data.currentValue) : ''
  const date = posterDate(data.date)

  return (
    <article
      style={{
        position: 'relative',
        width: PROTOTYPE_CANVAS.width,
        height: PROTOTYPE_CANVAS.height,
        overflow: 'hidden',
        color: '#F2F4F7',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt=""
        width={PROTOTYPE_CANVAS.width}
        height={PROTOTYPE_CANVAS.height}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }}
      />
      {DAILY_COVERS.map((cover) => (
        <div
          key={`${cover.x}-${cover.y}`}
          style={{
            position: 'absolute',
            left: cover.x,
            top: cover.y,
            width: cover.w,
            height: cover.h,
            background: cover.fill,
            borderRadius: 'rx' in cover ? cover.rx : 12,
          }}
        />
      ))}
      {showGuides ? (
        <>
          <Guide slot={DAILY_SLOTS.name} label="name" />
          <Guide slot={DAILY_SLOTS.earnedToday} label="earnedToday" />
          <Guide slot={DAILY_SLOTS.currentBalanceLabel} label="currentBalanceLabel" />
          <Guide slot={DAILY_SLOTS.currentBalance} label="currentBalance" />
          <Guide slot={DAILY_SLOTS.dailyReturn} label="dailyReturn" />
          <Guide slot={DAILY_SLOTS.totalEarnings} label="totalEarnings" />
          <Guide slot={DAILY_SLOTS.date} label="date" />
          <Guide slot={DAILY_SLOTS.todayProfit} label="todayProfit" />
        </>
      ) : null}
      <Field id="progress-share-name" slot={DAILY_SLOTS.name}>
        {name}
      </Field>
      <Field id="progress-share-earned-today" slot={DAILY_SLOTS.earnedToday}>
        {earned}
      </Field>
      {daily && balance ? (
        <>
          <Field id="progress-share-current-balance-label" slot={DAILY_SLOTS.currentBalanceLabel}>
            CURRENT BALANCE
          </Field>
          <Field id="progress-share-current-balance" slot={DAILY_SLOTS.currentBalance}>
            {balance}
          </Field>
        </>
      ) : null}
      <Field id="progress-share-daily-return" slot={DAILY_SLOTS.dailyReturn}>
        {ret}
      </Field>
      <Field id="progress-share-total-earnings" slot={DAILY_SLOTS.totalEarnings}>
        {total}
      </Field>
      <Field id="progress-share-today-profit" slot={DAILY_SLOTS.todayProfit}>
        {earned}
      </Field>
      <Field id="progress-share-date" slot={DAILY_SLOTS.date}>
        {date}
      </Field>
    </article>
  )
}
