'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * Dark is the product's identity, so this is a two-state toggle rather than a three-state menu.
 *
 * It renders a disabled placeholder until mounted: reading `resolvedTheme` during SSR would
 * hydrate the wrong icon and flash.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme !== 'light'

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      disabled={!mounted}
    >
      {mounted && !isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </Button>
  )
}
