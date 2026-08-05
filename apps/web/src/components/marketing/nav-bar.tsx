'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

import { Logo } from '@/components/common/logo'
import { Button } from '@/components/ui/button'
import { MARKETING_NAV } from '@/lib/navigation'
import { useScrolled } from '@/hooks/use-scrolled'
import { useAuthModal } from '@/providers/auth-modal-provider'
import { usePublishedPlatform } from '@/features/cms/site'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

import { MobileNav } from './mobile-nav'

function isNavActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Premium glass header — ~58px mobile / ~61px desktop (~20% slimmer). */
export function NavBar() {
  const pathname = usePathname()
  const scrolled = useScrolled(12)
  const { openAuth } = useAuthModal()
  const { platform, isSuccess } = usePublishedPlatform()
  const { isAuthenticated } = useSession()
  const dashboardHref = isAuthenticated ? ROUTES.dashboard.root : ROUTES.auth.login

  const navItems =
    isSuccess && platform.marketingNav.some((n) => n.enabled)
      ? platform.marketingNav
          .filter((n) => n.enabled)
          .map((n) => ({ label: n.label, href: n.href }))
      : MARKETING_NAV

  return (
    <header
      className={cn(
        'w-full min-w-0 pt-[env(safe-area-inset-top)] transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300',
        scrolled
          ? 'glass-strong border-b border-white/[0.08] shadow-[0_8px_28px_rgb(0_0_0_/_0.35)]'
          : 'border-b border-white/[0.06] bg-[#07131C]/85 backdrop-blur-xl',
      )}
    >
      <nav className="container-page flex h-[58px] min-w-0 items-center justify-between gap-3 py-0 lg:h-[61px]">
        <div className="relative shrink-0">
          <span
            className="pointer-events-none absolute -inset-2 rounded-full bg-accent-500/20 blur-md"
            aria-hidden
          />
          <Logo
            className="relative shrink-0 [&>span]:gap-3.5 sm:[&>span]:gap-4 [&_.font-semibold]:text-[1.625rem] lg:[&_.font-semibold]:text-[1.75rem] [&_.font-semibold]:font-semibold [&_.font-semibold]:leading-none [&_.font-semibold]:self-center"
            markClassName="size-[33px] lg:size-[40px] shrink-0 drop-shadow-[0_0_12px_rgba(18,214,160,0.35)]"
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
                    'relative whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] transition-[color,background-color] duration-[160ms] 2xl:px-3.5 2xl:text-body-sm',
                    active
                      ? 'bg-white/[0.04] text-fg'
                      : 'text-fg-muted hover:bg-white/[0.03] hover:text-fg',
                  )}
                >
                  {item.label}
                  {active ? (
                    <span
                      className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-accent shadow-[0_0_8px_rgba(18,214,160,0.65)]"
                      aria-hidden
                    />
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
            <Link href={dashboardHref}>Dashboard</Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => openAuth('login')}
          >
            Login
          </Button>
          <Button size="sm" className="hidden sm:inline-flex" onClick={() => openAuth('register')}>
            Get started
          </Button>
          <MobileNav />
        </div>
      </nav>
    </header>
  )
}
