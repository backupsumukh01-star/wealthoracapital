import type { NextConfig } from 'next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = path.dirname(fileURLToPath(import.meta.url))
/** Monorepo root — required so standalone traces workspace packages correctly. */
const tracingRoot = path.join(appDir, '../..')

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

/** Deployment identity — changes every Render/Git build so hashed chunks never collide across deploys. */
function resolveBuildId(): string {
  const commit =
    process.env.RENDER_GIT_COMMIT ||
    process.env.GIT_COMMIT ||
    process.env.COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA
  if (commit?.trim()) return commit.trim().slice(0, 16)
  return `local-${Date.now().toString(36)}`
}

const BUILD_ID = resolveBuildId()

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
  // Emit standalone under .next/standalone/apps/web for this monorepo layout.
  outputFileTracingRoot: tracingRoot,

  /** New build ID every deploy → new `/_next/static/{buildId}/…` asset URLs. */
  generateBuildId: async () => BUILD_ID,

  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
    NEXT_PUBLIC_GIT_COMMIT:
      process.env.RENDER_GIT_COMMIT ||
      process.env.GIT_COMMIT ||
      process.env.COMMIT_SHA ||
      BUILD_ID,
    NEXT_PUBLIC_BUILD_TIME: process.env.DEPLOYED_AT || new Date().toISOString(),
  },

  productionBrowserSourceMaps: false,

  transpilePackages: ['@meridian/shared'],

  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },

  /**
   * Stale path: daily-return desk used to be referenced as `/admin/returns`
   * (API remains `/api/v1/admin/returns`). Nav already uses `/admin/daily-return`.
   */
  async redirects() {
    return [
      {
        source: '/admin/returns',
        destination: '/admin/daily-return',
        permanent: false,
      },
    ]
  },

  async headers() {
    const csp = isProd
      ? [
          {
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
          },
        ]
      : []

    const hsts = isProd
      ? [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ]
      : []

    return [
      // Hashed webpack/turbopack chunks — cache forever; filename changes every deploy.
      {
        source: '/_next/static/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      // Public static files with extension (icons, etc.) — short cache + revalidate.
      {
        source: '/:path*.:ext(svg|png|jpg|jpeg|webp|ico|woff2|txt|xml)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      // HTML documents / RSC payloads — never cache. A normal refresh must pull the
      // newest shell that references the latest hashed assets.
      // Exclude `_next/*` so immutable static headers above are not overridden.
      {
        source: '/((?!_next/).*)',
        headers: [
          ...securityHeaders,
          ...hsts,
          ...csp,
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'X-Build-Id', value: BUILD_ID },
        ],
      },
    ]
  },
}

export default nextConfig
