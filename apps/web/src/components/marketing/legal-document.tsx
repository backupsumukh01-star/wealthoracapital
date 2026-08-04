import type { ReactNode } from 'react'

import { Alert } from '@/components/ui/alert'

export interface LegalSection {
  heading: string
  /** Placeholder summary of what the clause will cover. Not legal text. */
  summary: string
}

/**
 * Renders a legal document's structure with each clause marked as unwritten.
 *
 * The scaffold deliberately ships **no legal prose**. Invented terms of service on a financial
 * product are worse than an obviously empty page, because a plausible-looking clause invites
 * someone to ship it (docs/00 §8).
 */
export function LegalDocument({
  title,
  intro,
  sections,
  children,
}: {
  title: string
  intro: string
  sections: LegalSection[]
  children?: ReactNode
}) {
  return (
    <>
      <header className="space-y-4">
        <h1 className="text-display-md text-fg">{title}</h1>
        <p className="text-body-lg text-fg-muted">{intro}</p>
      </header>

      <Alert tone="warning" title="Not yet drafted">
        This document is an outline only. The operative text must be written and reviewed by
        qualified counsel before the platform accepts a single deposit.
      </Alert>

      {children}

      <ol className="space-y-8">
        {sections.map((section, index) => (
          <li key={section.heading} className="space-y-2">
            <h2 className="text-heading-md text-fg">
              <span className="mr-2 tabular-nums text-fg-subtle">{index + 1}.</span>
              {section.heading}
            </h2>
            <p className="text-body-md text-fg-muted">{section.summary}</p>
          </li>
        ))}
      </ol>
    </>
  )
}
