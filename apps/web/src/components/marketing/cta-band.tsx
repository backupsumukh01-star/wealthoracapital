'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight } from 'lucide-react'

import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { Button } from '@/components/ui/button'
import { useAuthModal } from '@/providers/auth-modal-provider'

export function CtaBand() {
  const { openAuth } = useAuthModal()
  return (
    <section className="section-y" aria-labelledby="cta-heading">
      <div className="container-page">
        <RevealOnScroll>
          <div className="panel-gradient-accent relative isolate overflow-hidden px-5 py-12 text-center sm:px-10 sm:py-16 lg:px-20 lg:py-20">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-15" />
            <div
              className="pointer-events-none absolute -left-10 top-0 size-40 rounded-full bg-accent-400/20 blur-3xl"
              aria-hidden
            />

            <p className="text-overline text-accent-100">Ready when you are</p>
            <h2
              id="cta-heading"
              className="text-display-md mx-auto mt-3 max-w-3xl break-words text-fg sm:mt-4"
            >
              Open an account. Inspect the archive. Deposit only when the numbers convince you.
            </h2>
            <p className="prose-measure mx-auto mt-4 text-body-md text-fg-muted sm:mt-5 sm:text-body-lg">
              Historical performance is published for transparency. Past results do not guarantee
              future returns — read the risk disclosure before you fund.
            </p>

            <div className="mx-auto mt-6 flex w-full max-w-[340px] flex-col items-stretch justify-center gap-2.5 sm:mt-8 sm:max-w-none sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="w-full bg-fg text-fg-inverse shadow-e3 hover:bg-fg/90 sm:w-auto"
                onClick={() => openAuth('register')}
              >
                Create your account
                <ArrowRight aria-hidden />
              </Button>
              <Button asChild size="lg" variant="glass" className="w-full sm:w-auto">
                <Link href={ROUTES.marketing.contact}>Talk to support</Link>
              </Button>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  )
}
