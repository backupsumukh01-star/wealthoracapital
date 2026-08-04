'use client'

import { CircleHelp } from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { LANDING_FAQS } from '@/lib/landing-data'
import { StructuredData } from '@/components/common/seo'
import { cn } from '@/lib/cn'

export interface FaqEntry {
  question: string
  answer: string
}

export const CORE_FAQS: FaqEntry[] = [...LANDING_FAQS]

export function FaqAccordion({ items = CORE_FAQS }: { items?: FaqEntry[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <>
      <StructuredData data={jsonLd} />
      <Accordion type="single" collapsible className="mx-auto w-full max-w-3xl space-y-3">
        {items.map((item) => (
          <AccordionItem
            key={item.question}
            value={item.question}
            className={cn(
              'overflow-hidden rounded-2xl border border-line bg-raised/80 px-3 shadow-e1',
              'transition-[border-color,box-shadow] duration-[160ms]',
              'data-[state=open]:border-accent-700/60 data-[state=open]:shadow-glow-soft',
            )}
          >
            <AccordionTrigger className="gap-3 py-4 text-body-md sm:text-body-lg">
              <span className="flex items-start gap-3 text-left">
                <CircleHelp
                  className="mt-0.5 size-4 shrink-0 text-accent-300"
                  aria-hidden
                />
                {item.question}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-body-sm text-fg-muted sm:text-body-md">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  )
}
