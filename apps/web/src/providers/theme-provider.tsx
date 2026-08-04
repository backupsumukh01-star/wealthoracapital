'use client'

import type { ReactNode } from 'react'
import { ThemeProvider as NextThemeProvider } from 'next-themes'

/**
 * Dark-first: a financial dashboard is looked at for long stretches and dark surfaces make
 * coloured data legible. The light theme is a first-class citizen, not an afterthought — it is
 * the same token names remapped, so nothing else in the app knows which one is active.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      themes={['dark', 'light']}
    >
      {children}
    </NextThemeProvider>
  )
}
