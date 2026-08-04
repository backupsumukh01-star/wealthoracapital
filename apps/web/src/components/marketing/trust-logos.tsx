'use client'

import { Marquee } from '@/components/motion/marquee'

const LOGOS = [
  'Visa',
  'Mastercard',
  'Binance Pay',
  'Ethereum',
  'Bitcoin',
  'USDT',
  'Stripe',
  'Swift',
] as const

/** Monochrome payment / rail marquee — text wordmarks only, no third-party assets. */
export function TrustLogos() {
  return (
    <section className="border-y border-line/70 py-6" aria-label="Supported rails">
      <div className="container-page mb-4 text-center">
        <p className="text-overline text-fg-subtle">Familiar rails · presentation labels</p>
      </div>
      <Marquee speed={48} pauseOnHover>
        {LOGOS.map((name) => (
          <span
            key={name}
            className="inline-flex h-12 items-center rounded-xl border border-line bg-inset/40 px-5 text-body-sm font-semibold tracking-wide text-fg-subtle"
          >
            {name}
          </span>
        ))}
      </Marquee>
    </section>
  )
}
