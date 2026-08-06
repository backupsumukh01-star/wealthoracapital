import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Web deploy identity — used by the client version guard and Render health checks.
 * Always no-store so operators never see a cached commit after deploy.
 */
export async function GET() {
  const commit =
    process.env.NEXT_PUBLIC_GIT_COMMIT ||
    process.env.RENDER_GIT_COMMIT ||
    process.env.GIT_COMMIT ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    'local'
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || commit
  const deployedAt =
    process.env.NEXT_PUBLIC_BUILD_TIME ||
    process.env.DEPLOYED_AT ||
    process.env.RENDER_GIT_COMMIT_TIMESTAMP ||
    null

  return NextResponse.json(
    {
      service: 'growzy-web',
      status: 'ok',
      commit,
      buildId,
      version: process.env.npm_package_version ?? '0.1.0',
      deployedAt,
      uptimeSeconds: Math.floor(process.uptime()),
      node: process.version,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    },
  )
}
