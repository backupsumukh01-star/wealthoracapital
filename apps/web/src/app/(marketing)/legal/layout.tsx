import type { ReactNode } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'

const LEGAL_NAV = [
  { label: 'Terms of service', href: ROUTES.marketing.legal.terms },
  { label: 'Privacy policy', href: ROUTES.marketing.legal.privacy },
  { label: 'Risk disclosure', href: ROUTES.marketing.legal.riskDisclosure },
  { label: 'Refund policy', href: ROUTES.marketing.legal.refundPolicy },
]

/**
 * Legal documents share one layout: a narrow measure for readability and a sibling index, so a
 * reader can move between the four without going back to the footer.
 */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container-page grid gap-12 pb-24 pt-8 lg:grid-cols-[220px_1fr] lg:gap-16 lg:pt-12">
      <nav aria-label="Legal documents" className="lg:sticky lg:top-[105px] lg:self-start">
        <h2 className="text-overline mb-4 text-fg-subtle">Legal</h2>
        <ul className="space-y-1">
          {LEGAL_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-md px-3 py-2 text-body-sm text-fg-muted transition-colors hover:bg-hover hover:text-fg"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <article className="prose-measure space-y-8">{children}</article>
    </div>
  )
}
