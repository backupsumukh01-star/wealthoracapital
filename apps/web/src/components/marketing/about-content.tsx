'use client'

import { motion } from 'framer-motion'
import { Eye, Scale, ShieldCheck } from 'lucide-react'

import { Section } from '@/components/common/section'
import { CtaBand } from '@/components/marketing/cta-band'
import { OperatingModel } from '@/components/marketing/operating-model'
import { PageHero } from '@/components/marketing/page-hero'
import { TeamRoster } from '@/components/marketing/team-roster'
import { StaggerGroup, StaggerItem } from '@/components/motion/stagger-group'
import { Card } from '@/components/ui/card'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { SITE } from '@/lib/constants'

const PRINCIPLES = [
  {
    icon: Eye,
    title: 'Show the work',
    body: 'If a figure appears on your dashboard, the activity behind it is published too. No summarised results without the underlying trades.',
  },
  {
    icon: Scale,
    title: 'Symmetric reporting',
    body: 'A losing month gets the same typography, the same chart, and the same placement as a winning one.',
  },
  {
    icon: ShieldCheck,
    title: 'Reversible by record',
    body: 'The ledger is append-only and every operator action is attributed. Mistakes are corrected with a new entry, never by editing history.',
  },
]

/** About desk body — principles, team, operating model. */
export function AboutContent() {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <>
      <PageHero
        eyebrow="About"
        title="A small desk with a public record"
        description={
          <>
            Operated by{' '}
            <strong className="font-medium text-fg">{SITE.legalName}</strong>. The programme is
            run by a trading team and a small operations group. What follows is who does what, and
            what we hold ourselves to.
          </>
        }
      />

      <Section eyebrow="Principles" title="Three rules we do not bend">
        <StaggerGroup className="grid gap-5 md:grid-cols-3">
          {PRINCIPLES.map((item, i) => (
            <StaggerItem key={item.title}>
              <Card className="h-full p-6 lg:p-7" interactive>
                <motion.span
                  className="grid size-10 place-items-center rounded-lg bg-accent-900/40 text-accent-300 shadow-[0_0_18px_-6px_rgba(18,214,160,0.55)]"
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : { y: [0, -3, 0], scale: [1, 1.04, 1] }
                  }
                  transition={{ duration: 3.6, delay: i * 0.25, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.08 }}
                >
                  <item.icon className="size-5" aria-hidden />
                </motion.span>
                <h2 className="text-heading-sm mt-5 text-fg">{item.title}</h2>
                <p className="text-body-sm mt-2 text-fg-muted">{item.body}</p>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Section>

      <Section
        eyebrow="The team"
        title="Who runs the programme"
        description="Desk roles that review risk, publish results, and clear money movement. Names are illustrative for the demo."
        backdrop="grid"
      >
        <TeamRoster />
      </Section>

      <Section eyebrow="Operations" title="How the desk is run day to day">
        <OperatingModel />
      </Section>
      <CtaBand />
    </>
  )
}
