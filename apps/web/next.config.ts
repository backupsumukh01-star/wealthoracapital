import type { NextConfig } from 'next'

/**
 * Headers duplicate what Nginx will also set in production (docs/15 §4). Belt and braces:
 * the app must be safe when run without the proxy in front of it, e.g. in staging or locally.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const isProd = process.env.NODE_ENV === 'production'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',

  // Source maps are not published in production (docs/14 §10 item 84).
  productionBrowserSourceMaps: false,

  // The shared package is consumed as TypeScript source rather than a build artefact.
  transpilePackages: ['@meridian/shared'],

  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },

  async headers() {
    const headers = [...securityHeaders]
    if (isProd) {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      })
      headers.push({
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "img-src 'self' data: blob: https:",
          "connect-src 'self'",
          "frame-ancestors 'none'",
          'upgrade-insecure-requests',
        ].join('; '),
      })
    }
    return [{ source: '/:path*', headers }]
  },
}

export default nextConfig
