import { NextResponse, type NextRequest } from 'next/server'
import { ROUTES } from '@meridian/shared'

/**
 * Edge routing guard — cookie presence only (not JWT verification).
 *
 * The API issues a single httpOnly `mfx_at` session cookie for every role. Investor and
 * admin areas both gate on its presence; the API itself re-verifies the role server-side
 * on every request.
 *
 * Disable with `NEXT_PUBLIC_ENABLE_ROUTE_GUARDS=false`.
 */

const INVESTOR_COOKIE = 'mfx_at'
const ADMIN_COOKIE = 'mfx_at'

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

export function middleware(request: NextRequest) {
  if (!GUARDS_ENABLED) {
    return NextResponse.next()
  }

  const { pathname, search } = request.nextUrl
  const hasInvestor = request.cookies.has(INVESTOR_COOKIE)
  const hasAdmin = request.cookies.has(ADMIN_COOKIE)

  const isAdminArea =
    pathname === ROUTES.admin.root || pathname.startsWith(`${ROUTES.admin.root}/`)
  const isAdminLogin = pathname === ROUTES.admin.login || pathname.startsWith(`${ROUTES.admin.login}/`)

  if (isAdminArea && !isAdminLogin && !hasAdmin) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.admin.login
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }

  // No redirect-away-from-login-when-authenticated rule here: `mfx_at` is shared by every
  // role, so its presence alone cannot prove ADMIN/SUPER_ADMIN and bouncing a signed-in
  // investor away from `/admin/login` would loop against `AdminSessionGate`'s real role
  // check. `AdminLoginForm` redirects an already-admin session client-side instead.

  if (startsWithAny(pathname, INVESTOR_PROTECTED) && !hasInvestor) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.auth.login
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }

  if (startsWithAny(pathname, AUTH_ONLY_PREFIXES) && hasInvestor) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.dashboard.root
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)'],
}
