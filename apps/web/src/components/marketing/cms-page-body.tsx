'use client'

import { useAdminOs } from '@/providers/admin-os-provider'

/** Injects CMS page body under static legal/about content when published. */
export function CmsPageBody({ slug }: { slug: 'faq' | 'about' | 'terms' | 'privacy' | 'contact' | 'footer' }) {
  const { ready, state } = useAdminOs()
  const page = state.pages.find((p) => p.slug === slug)
  if (!ready || !page?.body?.trim() || page.status === 'DRAFT') return null

  return (
    <div className="prose-measure mx-auto mt-8 max-w-3xl rounded-2xl border border-white/10 bg-raised/40 p-5 sm:p-6">
      <p className="text-caption uppercase tracking-wider text-accent-300">CMS content</p>
      <div className="mt-3 whitespace-pre-wrap text-body-sm leading-relaxed text-fg-muted">
        {page.body}
      </div>
    </div>
  )
}
