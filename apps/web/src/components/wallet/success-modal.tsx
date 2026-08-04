'use client'

import { CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

import { StatusTimeline } from '@/components/dashboard/status-timeline'
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

export function SuccessModal({
  open,
  onOpenChange,
  title,
  description,
  reference,
  timelineSteps,
  timelineActiveIndex = 2,
  primaryLabel = 'Done',
  onPrimary,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  reference?: string
  timelineSteps?: { id: string; label: string }[]
  timelineActiveIndex?: number
  primaryLabel?: string
  onPrimary?: () => void
}) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" hideClose>
        <DialogHeader className="items-center text-center sm:items-center">
          <motion.span
            className="mb-2 grid size-14 place-items-center rounded-full bg-profit/15 text-profit"
            initial={prefersReducedMotion ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          >
            <CheckCircle2 className="size-7" aria-hidden />
          </motion.span>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {reference ? (
            <p className="mt-2 rounded-lg border border-line bg-inset/50 px-3 py-1.5 font-mono text-caption text-fg">
              {reference}
            </p>
          ) : null}
        </DialogHeader>

        {timelineSteps ? (
          <div className="rounded-xl border border-line bg-inset/30 px-4 py-4">
            <StatusTimeline steps={timelineSteps} activeIndex={timelineActiveIndex} />
          </div>
        ) : null}

        <DialogFooter>
          <Button
            className="w-full sm:w-auto"
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
