'use client'

import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Renders the confirm button in the danger tone. */
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  /**
   * When set, the confirm button stays disabled until the user types this exact string.
   *
   * Reserved for the irreversible admin actions — approving a withdrawal, running the daily
   * return. Those move real money and must be harder than a single click (docs/07 §Safeguards).
   */
  requireTyped?: string
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  requireTyped,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')
  const unlocked = !requireTyped || typed.trim() === requireTyped

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped('')
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requireTyped ? (
          <div className="space-y-2">
            <Label htmlFor="confirm-phrase">
              Type <span className="font-mono text-fg">{requireTyped}</span> to continue
            </Label>
            <Input
              id="confirm-phrase"
              value={typed}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
            />
          </div>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={loading}>
              {cancelLabel}
            </Button>
          </DialogClose>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            disabled={!unlocked || loading}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
