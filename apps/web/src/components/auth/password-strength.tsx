'use client'

import { passwordStrength } from '@/lib/auth-schemas'
import { cn } from '@/lib/cn'

const TONE = [
  'bg-danger',
  'bg-danger',
  'bg-warning',
  'bg-accent-500',
  'bg-profit',
] as const

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const { score, label } = passwordStrength(password)

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full bg-line transition-colors duration-[160ms]',
              i < score && TONE[score],
            )}
          />
        ))}
      </div>
      <p className="text-caption text-fg-subtle">
        Strength: <span className="text-fg-muted">{label}</span>
      </p>
    </div>
  )
}
