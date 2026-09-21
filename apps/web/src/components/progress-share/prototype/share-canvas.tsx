'use client'

import { formatDecimal, formatPercent } from '@meridian/shared'

import type { ProgressShareInput } from './types'

export const PROTOTYPE_CANVAS = { width: 1080, height: 1920 } as const

function pctBare(value: string): string {
  return formatPercent(value.replace('%', ''), { decimals: 2, signed: true }).replace(/%/g, '')
}

function Field({
  left,
  top,
  fontSize,
  color,
  children,
}: {
  left: number
  top: number
  fontSize: number
  color: string
  children: string
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        fontSize,
        fontWeight: 750,
        color,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif',
      }}
    >
      {children}
    </div>
  )
}

export function ProgressSharePrototypeCanvas({ data }: { data: ProgressShareInput; design?: string }) {
  const daily = data.type === 'daily'
  const src = daily ? '/progress-share/daily.jpg' : '/progress-share/journey.jpg'
  const name = data.investorName

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
      {daily ? (
        <>
          <Field left={98} top={291} fontSize={name.length > 16 ? 34 : 46} color="#F4F7FA">
            {name}
          </Field>
          <Field left={268} top={510} fontSize={72} color="#5EE4B0">
            {formatDecimal(data.todayEarnings.replace(/[^0-9.-]/g, '') || '0', 2)}
          </Field>
          <Field left={200} top={799} fontSize={36} color="#F4F7FA">
            {pctBare(data.dailyReturn)}
          </Field>
          <Field left={700} top={799} fontSize={34} color="#F4F7FA">
            {formatDecimal(data.totalEarnings.replace(/[^0-9.-]/g, '') || '0', 2)}
          </Field>
        </>
      ) : (
        <>
          <Field left={99} top={291} fontSize={name.length > 16 ? 34 : 46} color="#F4F7FA">
            {name}
          </Field>
          <Field left={108} top={531} fontSize={84} color="#5EE4B0">
            {pctBare(data.performance)}
          </Field>
          <Field left={248} top={846} fontSize={40} color="#5EE4B0">
            {data.totalEarnings.startsWith('+')
              ? data.totalEarnings.replace('$', '')
              : `+${data.totalEarnings.replace('$', '')}`}
          </Field>
          <Field left={335} top={980} fontSize={28} color="#F4F7FA">
            {formatDecimal(data.totalInvestment.replace(/[^0-9.-]/g, '') || '0', 2)}
          </Field>
          <Field left={790} top={980} fontSize={28} color="#F4F7FA">
            {formatDecimal(data.currentValue.replace(/[^0-9.-]/g, '') || '0', 2)}
          </Field>
        </>
      )}
    </article>
  )
}
