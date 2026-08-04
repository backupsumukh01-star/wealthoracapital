'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'

import { Section } from '@/components/common/section'
import { CountUp } from '@/components/motion/count-up'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { Label } from '@/components/ui/label'

/** Projection calculator — maths for exploration only, not advice. */
export function InvestmentCalculator() {
  const [amount, setAmount] = useState(5000)
  const [monthlyPct, setMonthlyPct] = useState(4.5)
  const [months, setMonths] = useState(12)

  const projected = useMemo(() => {
    const rate = monthlyPct / 100
    const future = amount * Math.pow(1 + rate, months)
    return Number.isFinite(future) ? future : amount
  }, [amount, monthlyPct, months])

  const profit = projected - amount

  return (
    <Section
      id="calculator"
      eyebrow="Projection tools"
      title="Project a path — then verify the tape"
      description="Compound projection for exploration only. Past performance does not guarantee future results."
    >
      <RevealOnScroll>
        <div className="gradient-border-soft grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div className="space-y-5">
            <Field
              label="Investment amount"
              value={amount}
              min={500}
              max={100000}
              step={100}
              prefix="$"
              onChange={setAmount}
            />
            <Field
              label="Estimated monthly %"
              value={monthlyPct}
              min={0.5}
              max={12}
              step={0.1}
              suffix="%"
              onChange={setMonthlyPct}
            />
            <Field
              label="Duration (months)"
              value={months}
              min={1}
              max={36}
              step={1}
              suffix=" mo"
              onChange={setMonths}
            />
          </div>

          <motion.div
            key={`${amount}-${monthlyPct}-${months}`}
            initial={{ opacity: 0.6, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col justify-center rounded-2xl border border-line bg-inset/50 p-6"
          >
            <p className="text-caption text-fg-subtle">Projected balance</p>
            <p className="text-stat-xl mt-2 text-fg">
              <CountUp value={projected.toFixed(2)} prefix="$" decimals={2} />
            </p>
            <p className="mt-3 text-body-sm text-profit">
              Est. profit{' '}
              <span className="tabular-nums font-medium">
                +${profit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </p>
            <p className="mt-4 text-caption text-fg-subtle">
              Compounded monthly for {months} months at {monthlyPct}% — demo only.
            </p>
          </motion.div>
        </div>
      </RevealOnScroll>
    </Section>
  )
}

function Field({
  label,
  value,
  min,
  max,
  step,
  prefix,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  prefix?: string
  suffix?: string
  onChange: (n: number) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <span className="text-body-sm tabular-nums text-fg">
          {prefix}
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-hover accent-[var(--accent-400)]"
        aria-label={label}
      />
    </div>
  )
}
