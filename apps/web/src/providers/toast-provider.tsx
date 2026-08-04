'use client'

import { useTheme } from 'next-themes'
import { Toaster } from 'sonner'

/** Toasts slide in from the bottom-right and announce themselves to assistive technology. */
export function ToastProvider() {
  const { resolvedTheme } = useTheme()

  return (
    <Toaster
      position="bottom-right"
      theme={resolvedTheme === 'light' ? 'light' : 'dark'}
      closeButton
      richColors={false}
      duration={5000}
      toastOptions={{
        classNames: {
          toast: 'glass glass-edge !rounded-lg !border-glass-line !text-fg !shadow-e3',
          title: '!text-fg !font-medium',
          description: '!text-fg-muted',
          actionButton: '!bg-accent !text-accent-foreground',
          cancelButton: '!bg-hover !text-fg-muted',
          error: '!text-danger',
          success: '!text-success',
        },
      }}
    />
  )
}
