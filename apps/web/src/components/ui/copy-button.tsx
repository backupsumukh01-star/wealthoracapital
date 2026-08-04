'use client'

import { Check, Copy } from 'lucide-react'

import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/cn'

import { Button } from './button'

export interface CopyButtonProps {
  value: string
  /** What was copied, for the screen-reader announcement: "Account number copied". */
  label?: string
  className?: string
  size?: 'icon' | 'icon-sm'
}

/** Used everywhere a user has to retype something into their banking app. */
export function CopyButton({ value, label = 'Value', className, size = 'icon-sm' }: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn('shrink-0', className)}
      onClick={() => void copy(value)}
      aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
    >
      {copied ? <Check className="text-profit" aria-hidden /> : <Copy aria-hidden />}
      <span aria-live="polite" className="sr-only">
        {copied ? `${label} copied to clipboard` : ''}
      </span>
    </Button>
  )
}
