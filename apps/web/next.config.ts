import type { NextConfig } from 'next'

/**
 * Security headers for the Next.js app. In production these complement the
 * Render TLS terminator (no Nginx required).
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

function apiConnectSrc(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (!apiUrl) return "'self'"
  try {
    return `'self' ${new URL(apiUrl).origin}`
  } catch {
    return "'self'"
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',

  productionBrowserSourceMaps: false,

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
          `connect-src ${apiConnectSrc()}`,
          "frame-ancestors 'none'",
          'upgrade-insecure-requests',
        ].join('; '),
      })
    }
    return [{ source: '/:path*', headers }]
  },
}

export default nextConfig
