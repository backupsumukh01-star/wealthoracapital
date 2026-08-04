import type { Metadata } from 'next'
import { ROUTES } from '@meridian/shared'

import { AboutContent } from '@/components/marketing/about-content'

export const metadata: Metadata = {
  title: 'About the desk',
  description: 'Who runs the programme, how it is operated, and the principles it is held to.',
  alternates: { canonical: ROUTES.marketing.about },
}

export default function AboutPage() {
  return <AboutContent />
}
