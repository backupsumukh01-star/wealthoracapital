import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { Providers } from '@/providers'
import { SITE } from '@/lib/constants'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: '/icon', type: 'image/png' }],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#07131C' },
    { media: '(prefers-color-scheme: light)', color: '#f4f8fb' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Zoom is never disabled: pinch-zoom is how a partially sighted user reads a balance.
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const release =
    process.env.NEXT_PUBLIC_GIT_COMMIT ??
    process.env.RENDER_GIT_COMMIT ??
    process.env.GIT_COMMIT ??
    'local'
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID ?? release
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME ?? ''

  return (
    // `suppressHydrationWarning` is required by next-themes, which writes the theme class on the
    // html element before React hydrates to avoid a flash of the wrong theme.
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body
        data-release={release}
        data-build-id={buildId}
        data-build-time={buildTime}
        className="min-h-dvh overflow-x-clip bg-base font-sans text-fg antialiased"
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
        >
          Skip to content
        </a>

        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
