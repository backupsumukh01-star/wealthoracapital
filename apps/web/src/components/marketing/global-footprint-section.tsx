'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight } from 'lucide-react'

import { Section } from '@/components/common/section'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { Button } from '@/components/ui/button'

import { InvestorMap } from './investor-map'

/** Homepage footprint teaser — full community story lives on /investors. */
export function GlobalFootprintSection() {
  return (
    <Section
      id="footprint"
      eyebrow="Global footprint"
      title="Investors across major financial hubs"
      description="Funded accounts across major financial hubs."
      className="!py-10 sm:!py-14"
    >
      <InvestorMap showHeader={false} />
      <RevealOnScroll className="mt-4 flex justify-center sm:mt-6">
        <Button asChild size="md" variant="secondary" className="w-full max-w-md sm:w-auto">
          <Link href={ROUTES.marketing.investors}>
            Explore Investors
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </RevealOnScroll>
    </Section>
  )
}
