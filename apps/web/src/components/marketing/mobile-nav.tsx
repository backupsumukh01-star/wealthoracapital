'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  Cpu,
  Home,
  Info,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  Menu,
  ScanEye,
  Users,
  Workflow,
  X,
  type LucideIcon,
} from 'lucide-react'

import { Logo } from '@/components/common/logo'
import { Button } from '@/components/ui/button'
import { MARKETING_NAV, MARKETING_SECONDARY_NAV } from '@/lib/navigation'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

const ICONS: Record<string, LucideIcon> = {
  [ROUTES.marketing.home]: Home,
  [ROUTES.marketing.ourTradingSystem]: Workflow,
  [ROUTES.marketing.performance]: ChartNoAxesCombined,
  [ROUTES.marketing.transparency]: ScanEye,
  [ROUTES.marketing.security]: Lock,
  [ROUTES.marketing.about]: Info,
  [ROUTES.marketing.contact]: LifeBuoy,
  [ROUTES.marketing.technology]: Cpu,
  [ROUTES.marketing.investors]: Users,
  [ROUTES.marketing.resources]: BookOpen,
  [ROUTES.marketing.howItWorks]: Workflow,
  [ROUTES.marketing.faq]: BookOpen,
}

/** Portal-based drawer — slides from right, overlay + ESC close. */
export function MobileNav() {
  const pathname = usePathname()
  const { isAuthenticated } = useSession()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const dashboardHref = isAuthenticated ? ROUTES.dashboard.root : ROUTES.auth.login

  const drawer =
    mounted &&
    createPortal(
      <AnimatePresence>
        {open ? (
          <div
            className="fixed inset-0 z-[100] xl:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            data-mobile-nav="open"
          >
            <motion.button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="absolute inset-y-0 right-0 flex w-[min(100%,22rem)] flex-col border-l border-glass-line bg-base pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-e4"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-glass-line px-4">
                <Logo />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                >
                  <X aria-hidden />
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                <p className="text-overline mb-3 text-fg-subtle">Navigate</p>
                <ul className="space-y-1.5">
                  {MARKETING_NAV.map((item) => {
                    const Icon = ICONS[item.href] ?? Home
                    const active =
                      item.href === '/'
                        ? pathname === '/'
                        : pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            'flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                            active
                              ? 'border-accent-700 bg-accent-500/10'
                              : 'border-line bg-raised/50',
                          )}
                        >
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-inset text-accent-200">
                            <Icon className="size-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-body-sm text-fg">{item.label}</span>
                            {item.description ? (
                              <span className="block text-[11px] text-fg-subtle">
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>

                <p className="text-overline mb-3 mt-6 text-fg-subtle">More</p>
                <ul className="space-y-1.5">
                  {MARKETING_SECONDARY_NAV.map((item) => {
                    const Icon = ICONS[item.href] ?? BookOpen
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-inset/40 px-3 py-2"
                        >
                          <Icon className="size-4 shrink-0 text-accent-300" aria-hidden />
                          <span className="min-w-0 text-body-sm text-fg">{item.label}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div className="shrink-0 space-y-2 border-t border-glass-line px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <Button asChild fullWidth size="md">
                  <Link href={ROUTES.auth.register} onClick={() => setOpen(false)}>
                    Get started
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="secondary" fullWidth size="md">
                    <Link href={ROUTES.auth.login} onClick={() => setOpen(false)}>
                      Login
                    </Link>
                  </Button>
                  <Button asChild variant="glass" fullWidth size="md">
                    <Link href={dashboardHref} onClick={() => setOpen(false)}>
                      <LayoutDashboard aria-hidden />
                      Dashboard
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>,
      document.body,
    )

  return (
    <div className="xl:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X aria-hidden /> : <Menu aria-hidden />}
      </Button>
      {drawer}
    </div>
  )
}
