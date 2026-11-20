'use client'

import Link from 'next/link'

import { Logo } from '@/components/common/logo'
import { usePublishedLanding } from '@/features/cms/site'
import { useCmsBootstrap } from '@/features/cms/hooks'
import { SITE } from '@/lib/constants'
import { FOOTER_NAV } from '@/lib/navigation'

export function Footer() {
  const year = new Date().getFullYear()
  const { landing } = usePublishedLanding()
  const { data: boot } = useCmsBootstrap()
  const seo = (boot?.siteSeo ?? {}) as Record<string, string | boolean | undefined>

  const supportEmail =
    landing.supportEmail?.trim() ||
    String(seo.supportEmail || '').trim() ||
    SITE.supportEmail

  const social = [
    { label: 'X / Twitter', href: landing.social.twitter?.trim(), handle: 'X' },
    { label: 'LinkedIn', href: landing.social.linkedin?.trim(), handle: 'in' },
    { label: 'Telegram', href: landing.telegram?.trim(), handle: 'Tg' },
    { label: 'Instagram', href: landing.social.instagram?.trim(), handle: 'Ig' },
  ].filter((s) => Boolean(s.href))

  return (
    <footer className="relative isolate overflow-hidden border-t border-glass-line">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-inset/80" aria-hidden />
      <div
        className="pointer-events-none absolute -left-24 bottom-0 -z-10 size-[22rem] rounded-full bg-accent-500/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-0 -z-10 size-[18rem] rounded-full bg-hl-violet/12 blur-3xl"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px section-divider" />

      <div className="container-page py-12 sm:py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.35fr_2fr] lg:gap-12">
          <div className="space-y-6">
            <Logo />
            <p className="text-caption text-fg-subtle">
              {landing.companyName || String(seo.websiteName || '') || SITE.name}
            </p>
            <p className="prose-measure text-body-sm text-fg-muted">
              {landing.footerTagline || SITE.description}
            </p>

            <div className="rounded-2xl border border-line/80 bg-raised/80 p-4 sm:p-5">
              <p className="text-overline mb-2 text-fg-subtle">Updates</p>
              <p className="text-body-sm text-fg-muted">
                Newsletter signup is not open yet. For desk questions, email{' '}
                <a
                  href={`mailto:${supportEmail}`}
                  className="break-all text-accent-300 underline-offset-4 hover:underline"
                >
                  {supportEmail}
                </a>
                .
              </p>
            </div>

            {social.length > 0 ? (
              <div>
                <p className="text-overline mb-3 text-fg-subtle">Social</p>
                <ul className="flex flex-wrap gap-2">
                  {social.map((s) => (
                    <li key={s.label}>
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex size-10 items-center justify-center rounded-full border border-line-default bg-raised text-caption text-fg-muted transition-all duration-[160ms] hover:-translate-y-0.5 hover:border-accent-700 hover:text-accent-200 hover:shadow-glow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base"
                        aria-label={s.label}
                      >
                        {s.handle}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-caption text-fg-subtle">
              <a
                href={`mailto:${supportEmail}`}
                className="underline-offset-4 hover:text-fg hover:underline"
              >
                {supportEmail}
              </a>
              {seo.supportPhone ? ` · ${String(seo.supportPhone)}` : ''}
              {seo.supportHours ? ` · ${String(seo.supportHours)}` : ''}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {FOOTER_NAV.map((section) => (
              <nav key={section.label} aria-labelledby={`footer-${section.label}`}>
                <h2 id={`footer-${section.label}`} className="text-overline mb-4 text-fg-subtle">
                  {section.label}
                </h2>
                <ul className="space-y-2.5">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="rounded-sm text-body-sm text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-base"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-line/70 pt-8">
          <p className="text-caption text-fg-subtle">
            © {year} {landing.companyName || 'Wealthora Capital'}. All rights reserved. Not
            financial advice — past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </footer>
  )
}
