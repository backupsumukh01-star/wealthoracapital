import type { MetadataRoute } from 'next'

import { SITE } from '@/lib/constants'

/** Web app manifest — install / theme metadata for supported browsers. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.wordmark.primary,
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#07131C',
    theme_color: '#07131C',
    lang: 'en',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
