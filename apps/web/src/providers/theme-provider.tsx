'use client'

import type { ReactNode } from 'react'
import { ThemeProvider as NextThemeProvider } from 'next-themes'

/**
 * Dark-only product UI. Theme switching is disabled — the app always renders dark.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      forcedTheme="dark"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      themes={['dark']}
    >
      {children}
    </NextThemeProvider>
  )
}
