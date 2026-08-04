import type { Metadata } from 'next'

import { SITE } from '@/lib/constants'

/**
 * Builds a page's metadata object.
 *
 * Public pages call this and spread the result into their exported `metadata`; authenticated
 * pages pass `noIndex` so a signed-in screen never ends up in a search index.
 */
export function buildMetadata({
  title,
  description,
  path,
  noIndex = false,
  image,
}: {
  title: string
  description?: string
  path?: string
  noIndex?: boolean
  image?: string
}): Metadata {
  const resolvedDescription = description ?? SITE.description
  const url = path ? new URL(path, SITE.url).toString() : SITE.url

  return {
    title,
    description: resolvedDescription,
    alternates: path ? { canonical: path } : undefined,
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      title,
      description: resolvedDescription,
      url,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: resolvedDescription,
      images: image ? [image] : undefined,
    },
  }
}

/**
 * A JSON-LD block.
 *
 * The payload is serialised by us and never contains user input, which is what makes
 * `dangerouslySetInnerHTML` acceptable here and nowhere else in the codebase.
 */
export function StructuredData({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
