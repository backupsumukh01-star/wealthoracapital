'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

import { Logo } from '@/components/common/logo'
import { Button } from '@/components/ui/button'
import { MARKETING_NAV } from '@/lib/navigation'
import { useScrolled } from '@/hooks/use-scrolled'
import { usePublishedPlatform } from '@/features/cms/site'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

const MobileNav = dynamic(
  () => import('./mobile-nav').then((m) => m.MobileNav),
  { ssr: false, loading: () => <span className="inline-block size-9" aria-hidden /> },
)

function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Premium glass header — ~58px mobile / ~61px desktop (~20% slimmer). */
export function NavBar() {
  const pathname = usePathname()
  const scrolled = useScrolled(12)
  const { platform, isSuccess } = usePublishedPlatform()
  const { isAuthenticated } = useSession()

  const navItems =
    isSuccess && platform.marketingNav.some((n) => n.enabled)
      ? platform.marketingNav
          .filter((n) => n.enabled)
          .map((n) => ({ label: n.label, href: n.href }))
      : MARKETING_NAV

  return (
    <header
      className={cn(
        'w-full min-w-0 border-b border-white/[0.08] bg-[#07090B] pt-[env(safe-area-inset-top)] transition-[box-shadow] duration-300',
        scrolled && 'shadow-[0_8px_28px_rgb(0_0_0_/_0.45)]',
      )}
    >
      <nav className="container-page flex h-[58px] min-w-0 items-center justify-between gap-3 py-0 lg:h-[61px]">
        <div className="relative z-10 shrink-0">
          <span
            className="pointer-events-none absolute -inset-2 rounded-full bg-accent-500/20 blur-md"
            aria-hidden
          />
          <Logo
            className="relative shrink-0 [&>span]:gap-3.5 sm:[&>span]:gap-4 [&_.font-semibold]:text-[1.625rem] lg:[&_.font-semibold]:text-[1.75rem] [&_.font-semibold]:font-semibold [&_.font-semibold]:leading-none [&_.font-semibold]:self-center"
            markClassName="size-[33px] lg:size-[40px] shrink-0 drop-shadow-[0_0_12px_rgba(212,217,223,0.16)]"
          />
        </div>

        <ul className="hidden min-w-0 items-center gap-0.5 xl:flex">
          {navItems.map((item) => {
            const active = isNavActive(pathname, item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] transition-[color] duration-[160ms] 2xl:px-3.5 2xl:text-body-sm',
                    active ? 'text-fg' : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {item.label}
                  {active ? (
                    <span
                      className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-accent-300/90"
                      aria-hidden
                    />
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {isAuthenticated ? (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href={ROUTES.dashboard.root}>Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href={ROUTES.auth.login}>Login</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href={ROUTES.auth.register}>Get started</Link>
              </Button>
            </>
          )}
          <MobileNav />
        </div>
      </nav>
    </header>
  )
}
