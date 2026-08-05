'use client'

/**
 * Investor-facing published report downloads.
 * Report library is admin-only in production — show empty until a public archive API exists.
 */
export function CmsReportDownloads() {
  return (
    <p className="text-caption text-fg-subtle">
      No published reports yet. Check back after the next statement cycle.
    </p>
  )
}
