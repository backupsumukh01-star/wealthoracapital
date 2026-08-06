import type { Metadata } from 'next'

import { LandingSections } from '@/components/marketing/landing-sections'
import { SITE } from '@/lib/constants'

export const metadata: Metadata = {
  title: `${SITE.name} — ${SITE.tagline}`,
  description: SITE.description,
  alternates: { canonical: '/' },
}

/**
 * Premium conversion landing — Demo Mode IA restored
 * (sections, motion, fixtures, testimonials wall).
 * Section visibility is controlled by Frontend CMS (`section.visible`).
 */
export default function LandingPage() {
  return <LandingSections />
}
