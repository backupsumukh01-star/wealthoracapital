'use client'

import { useEffect, useState } from 'react'
import { Copy, Download, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import {
  progressShareService,
  type ProgressShareLink,
} from '@/services/progress-share.service'

const SHARE_TEXT = "Today's earnings on Wealthora Capital."
const FILE_NAME = 'wealthora-todays-earnings.png'

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

export function ProgressShareControls({
  compact = false,
}: {
  compact?: boolean
}) {
  const [link, setLink] = useState<ProgressShareLink | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function ensureLink() {
    if (link) return link
    const created = await progressShareService.createLink()
    setLink(created)
    return created
  }

  function urlsFor(created: ProgressShareLink) {
    return {
      imageUrl: created.dailyImageUrl,
      shareUrl: created.dailyShareUrl,
    }
  }

  function showPreview(blob: Blob) {
    const url = URL.createObjectURL(blob)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // Only revoke the last object URL on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onShare() {
    setBusy('share')
    try {
      const created = await ensureLink()
      const { imageUrl, shareUrl } = urlsFor(created)
      const blob = await progressShareService.fetchImageBlob({ imageUrl })
      showPreview(blob)
      const file = new File([blob], FILE_NAME, { type: 'image/png' })

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ title: 'Wealthora Capital', text: SHARE_TEXT, files: [file] })
            return
          }
          await navigator.share({ title: 'Wealthora Capital', text: SHARE_TEXT, url: shareUrl })
          return
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
        }
      }

      downloadBlob(blob, FILE_NAME)
      const ok = await copyText(shareUrl)
      if (ok) toast.success('Image downloaded and link copied')
      else toast.success('Image downloaded')
    } catch {
      toast.error('Could not share progress')
    } finally {
      setBusy(null)
    }
  }

  async function onDownload() {
    setBusy('download')
    try {
      const created = await ensureLink()
      const { imageUrl } = urlsFor(created)
      const blob = await progressShareService.fetchImageBlob({ imageUrl })
      showPreview(blob)
      downloadBlob(blob, FILE_NAME)
      toast.success('Image downloaded')
    } catch {
      toast.error('Could not download image')
    } finally {
      setBusy(null)
    }
  }

  async function onCopy() {
    setBusy('link')
    try {
      const created = await ensureLink()
      const { shareUrl } = urlsFor(created)
      const ok = await copyText(shareUrl)
      if (ok) toast.success('Share link copied')
      else toast.error('Could not copy link')
    } catch {
      toast.error('Could not create share link')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card padded="md" className="space-y-4">
      <div>
        <p className="text-overline text-accent-300">Share My Progress</p>
        <p className="mt-1 text-body-sm text-fg-muted">
          Today&apos;s earnings, daily return and today&apos;s performance.
        </p>
      </div>

      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Today's Earnings preview"
          className={cn('w-full rounded-xl border border-white/10', compact ? 'max-w-sm' : 'max-w-md')}
          width={1080}
          height={1920}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Button type="button" size="sm" fullWidth loading={busy === 'share'} onClick={() => void onShare()}>
          <Share2 aria-hidden />
          Share
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          fullWidth
          loading={busy === 'download'}
          onClick={() => void onDownload()}
        >
          <Download aria-hidden />
          Download image
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          fullWidth
          loading={busy === 'link'}
          onClick={() => void onCopy()}
        >
          <Copy aria-hidden />
          Copy share link
        </Button>
      </div>
    </Card>
  )
}
