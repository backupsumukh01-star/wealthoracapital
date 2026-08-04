'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@meridian/shared'
import { LifeBuoy, LogOut, Settings, ShieldCheck, User as UserIcon } from 'lucide-react'

import { InvestorAvatar } from '@/components/dashboard/investor-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { clearDemoSession } from '@/lib/demo-auth'
import { useSession } from '@/providers/session-provider'
import { cn } from '@/lib/cn'

/**
 * The account menu in the dashboard and admin top bars.
 * Demo sign-out clears the local session cookie; production will call the API (docs/08 §5).
 */
export function UserMenu({ className }: { className?: string }) {
  const router = useRouter()
  const { session, isAdmin } = useSession()

  const firstName = session?.user.firstName ?? 'Guest'
  const lastName = session?.user.lastName ?? ''
  const email = session?.user.email ?? 'not signed in'

  function signOut() {
    clearDemoSession()
    router.push(ROUTES.auth.login)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-hover',
          className,
        )}
        aria-label="Account menu"
      >
        <InvestorAvatar
          firstName={firstName}
          lastName={lastName}
          src={session?.user.avatarUrl}
          size="sm"
          verified
          online
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <span className="block text-body-sm font-medium text-fg">
            {firstName} {lastName}
          </span>
          <span className="block truncate text-caption font-normal text-fg-subtle">{email}</span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={ROUTES.dashboard.settings.profile}>
            <UserIcon aria-hidden />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.dashboard.settings.preferences}>
            <Settings aria-hidden />
            Preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={ROUTES.marketing.contact}>
            <LifeBuoy aria-hidden />
            Support
          </Link>
        </DropdownMenuItem>

        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={ROUTES.admin.root}>
                <ShieldCheck aria-hidden />
                Admin console
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem destructive onSelect={signOut}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
