'use client'

import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowRight } from 'lucide-react'

import { Section } from '@/components/common/section'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { Button } from '@/components/ui/button'
import { usePublishedFrontend } from '@/features/cms/frontend-hooks'
import { usePublishedFaqs } from '@/features/cms/site'
import { HOME_FAQS } from '@/lib/landing-data'

import { FaqAccordion } from './faq-accordion'

/** Homepage FAQ — published CMS faqs when available, else static seed. */
export function HomeFaq() {
  const { faqs } = usePublishedFaqs()
  const { getSection } = usePublishedFrontend()
  const section = getSection('faq')
  const items =
    faqs.length > 0
      ? faqs.slice(0, 5).map((f) => ({ question: f.question, answer: f.answer }))
      : [...HOME_FAQS]

  return (
    <Section
      id="faq"
      eyebrow={section?.eyebrow || 'FAQ'}
      title={section?.title || 'Clear answers before you deposit'}
      description={
        section?.description || 'The essentials. Full help centre lives under Resources.'
      }
      centered
      className="!py-10 sm:!py-14"
    >
      <div className="mx-auto w-full max-w-3xl min-w-0">
        <FaqAccordion items={items} />
      </div>
      <RevealOnScroll className="mt-5 flex justify-center">
        <Button asChild variant="ghost" size="md" className="w-full max-w-xs sm:w-auto">
          <Link href={ROUTES.marketing.faq}>
            View all FAQs
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </RevealOnScroll>
    </Section>
  )
}
