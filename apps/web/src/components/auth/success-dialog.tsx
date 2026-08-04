'use client'

import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

export function SuccessDialog({
  open,
  onOpenChange,
  title,
  description,
  primaryLabel = 'Continue',
  onPrimary,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  primaryLabel?: string
  onPrimary?: () => void
}) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" hideClose>
        <DialogHeader className="items-center text-center">
          <motion.span
            className="mb-2 grid size-14 place-items-center rounded-full bg-profit/15 text-profit"
            initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          >
            <CheckCircle2 className="size-7" aria-hidden />
          </motion.span>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button
            className="w-full"
            onClick={() => {
              onPrimary?.()
              onOpenChange(false)
            }}
          >
            {primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ErrorDialog({
  open,
  onOpenChange,
  title,
  description,
  primaryLabel = 'Try again',
  onPrimary,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  primaryLabel?: string
  onPrimary?: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <span className="mb-2 grid size-14 place-items-center rounded-full bg-danger/15 text-danger">
            <AlertTriangle className="size-7" aria-hidden />
          </span>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => {
              onPrimary?.()
              onOpenChange(false)
            }}
          >
            {primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
