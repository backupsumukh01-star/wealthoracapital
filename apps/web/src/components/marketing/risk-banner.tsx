import { RiskDisclosure } from '@/components/common/risk-disclosure'

/** The landing page's dedicated risk section. It is a section, not a footnote, by design. */
export function RiskBanner() {
  return (
    <section className="border-t border-line bg-inset/30 py-12" aria-labelledby="risk-heading">
      <div className="container-page">
        <h2 id="risk-heading" className="sr-only">
          Risk disclosure
        </h2>
        <RiskDisclosure className="mx-auto max-w-4xl" />
      </div>
    </section>
  )
}
