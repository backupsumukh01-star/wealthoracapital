import { NextResponse, type NextRequest } from 'next/server'
import { ROUTES } from '@meridian/shared'

/**
 * Edge routing guard — cookie presence only (not JWT verification).
 *
 * The API issues a single httpOnly `mfx_at` session cookie for every role. Investor and
 * admin areas both gate on its presence; the API itself re-verifies the role server-side
 * on every request.
 *
 * Also stamps HTML/document responses with no-store so CDNs and browsers never pin an
 * old shell that references deleted `/_next/static` chunks after a deploy.
 *
 * Disable with `NEXT_PUBLIC_ENABLE_ROUTE_GUARDS=false`.
 */

const INVESTOR_COOKIE = 'mfx_at'
const ADMIN_COOKIE = 'mfx_at'
/** Isolated Salesman access cookie. Never treat this as investor/admin `mfx_at`. */
const SALES_COOKIE = 'wealthora_sales_at'

const INVESTOR_PROTECTED = [
  ROUTES.dashboard.root,
  ROUTES.dashboard.wallet,
  ROUTES.dashboard.deposit,
  ROUTES.dashboard.withdraw,
  ROUTES.dashboard.trades,
  ROUTES.dashboard.performance,
  ROUTES.dashboard.transactions,
  ROUTES.dashboard.notifications,
  ROUTES.dashboard.referrals,
  ROUTES.dashboard.support,
  ROUTES.auth.onboarding,
  '/settings',
  '/ledger',
]

const AUTH_ONLY_PREFIXES = [
  ROUTES.auth.login,
  ROUTES.auth.register,
  ROUTES.auth.forgotPassword,
  ROUTES.auth.resetPassword,
]

const GUARDS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ROUTE_GUARDS !== 'false'

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function withDocumentCacheHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    'Cache-Control',
    'private, no-cache, no-store, max-age=0, must-revalidate',
  )
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  return response
}

export function middleware(request: NextRequest) {
  if (!GUARDS_ENABLED) {
    return withDocumentCacheHeaders(NextResponse.next())
  }

  const { pathname, search } = request.nextUrl
  const hasInvestor = request.cookies.has(INVESTOR_COOKIE)
  const hasAdmin = request.cookies.has(ADMIN_COOKIE)
  const hasSales = request.cookies.has(SALES_COOKIE)

  const isSalesOwnerArea =
    pathname === ROUTES.sales.owner.root || pathname.startsWith(`${ROUTES.sales.owner.root}/`)
  const isSalesLogin =
    pathname === ROUTES.sales.login || pathname.startsWith(`${ROUTES.sales.login}/`)
  const isSalesArea = pathname === ROUTES.sales.root || pathname.startsWith(`${ROUTES.sales.root}/`)

  // Owner portal reuses Admin/Super Admin cookies. Salesman cookies are not sufficient.
  if (isSalesOwnerArea && !hasAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.admin.login
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return withDocumentCacheHeaders(NextResponse.redirect(url))
  }

  if (isSalesLogin && hasSales) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.sales.dashboard
    url.search = ''
    return withDocumentCacheHeaders(NextResponse.redirect(url))
  }

  if (isSalesArea && !isSalesLogin && !isSalesOwnerArea && !hasSales) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.sales.login
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return withDocumentCacheHeaders(NextResponse.redirect(url))
  }

  const isAdminArea =
    pathname === ROUTES.admin.root || pathname.startsWith(`${ROUTES.admin.root}/`)
  const isAdminLogin = pathname === ROUTES.admin.login || pathname.startsWith(`${ROUTES.admin.login}/`)

  if (isAdminArea && !isAdminLogin && !hasAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.admin.login
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return withDocumentCacheHeaders(NextResponse.redirect(url))
  }

  // No redirect-away-from-login-when-authenticated rule here: `mfx_at` is shared by every
  // role, so its presence alone cannot prove ADMIN/SUPER_ADMIN and bouncing a signed-in
  // investor away from `/admin/login` would loop against `AdminSessionGate`'s real role
  // check. `AdminLoginForm` redirects an already-admin session client-side instead.

  if (startsWithAny(pathname, INVESTOR_PROTECTED) && !hasInvestor) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.auth.login
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return withDocumentCacheHeaders(NextResponse.redirect(url))
  }

  if (startsWithAny(pathname, AUTH_ONLY_PREFIXES) && hasInvestor) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.dashboard.root
    url.search = ''
    return withDocumentCacheHeaders(NextResponse.redirect(url))
  }

  return withDocumentCacheHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
}
