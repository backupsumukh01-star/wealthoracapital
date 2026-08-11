'use client'

import { useState } from 'react'
import { Copy, Download, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { progressShareService } from '@/services/progress-share.service'

const SHARE_TEXT = 'My investment progress on Growzy Capital.'

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Dashboard / share-page controls: Share · Download · Copy link. */
export function ProgressShareControls({
  compact = false,
}: {
  compact?: boolean
}) {
  const [busy, setBusy] = useState<'share' | 'download' | 'link' | null>(null)

  async function ensureLink() {
    return progressShareService.createLink()
  }

  async function onCopyLink() {
    setBusy('link')
    try {
      const link = await ensureLink()
      const ok = await copyText(link.shareUrl)
      if (ok) toast.success('Share link copied')
      else toast.error('Could not copy link')
    } catch {
      toast.error('Could not create share link')
    } finally {
      setBusy(null)
    }
  }

  async function onDownload() {
    setBusy('download')
    try {
      const link = await ensureLink()
      const blob = await progressShareService.fetchImageBlob({ imageUrl: link.imageUrl })
      downloadBlob(blob, 'growzy-progress.png')
      toast.success('Progress image downloaded')
    } catch {
      toast.error('Could not download image')
    } finally {
      setBusy(null)
    }
  }

  async function onShare() {
    setBusy('share')
    try {
      const link = await ensureLink()
      const blob = await progressShareService.fetchImageBlob({ imageUrl: link.imageUrl })
      const file = new File([blob], 'growzy-progress.png', { type: 'image/png' })

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              title: 'Growzy Capital',
              text: SHARE_TEXT,
              files: [file],
            })
            return
          }
          await navigator.share({
            title: 'Growzy Capital',
            text: SHARE_TEXT,
            url: link.shareUrl,
          })
          return
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
        }
      }

      downloadBlob(blob, 'growzy-progress.png')
      const ok = await copyText(link.shareUrl)
      if (ok) toast.success('Image downloaded and link copied')
      else toast.success('Image downloaded')
    } catch {
      toast.error('Could not share progress')
    } finally {
      setBusy(null)
    }
  }

  const actions = (
    <div className={compact ? 'grid grid-cols-1 gap-2 sm:grid-cols-3' : 'flex flex-col gap-2 sm:flex-row'}>
      <Button
        type="button"
        size="sm"
        fullWidth
        loading={busy === 'share'}
        loadingText="Sharing"
        onClick={() => void onShare()}
      >
        <Share2 aria-hidden />
        Share
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        fullWidth
        loading={busy === 'download'}
        loadingText="Downloading"
        onClick={() => void onDownload()}
      >
        <Download aria-hidden />
        Download image
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        fullWidth
        loading={busy === 'link'}
        loadingText="Copying"
        onClick={() => void onCopyLink()}
      >
        <Copy aria-hidden />
        Copy share link
      </Button>
    </div>
  )

  if (compact) return actions

  return (
    <Card padded="md" className="space-y-3">
      <div>
        <p className="text-overline text-accent-300">Share My Progress</p>
        <p className="mt-1 text-body-sm text-fg-muted">
          Branded image with your investment totals — no email, wallet, or account details.
        </p>
      </div>
      {actions}
    </Card>
  )
}
