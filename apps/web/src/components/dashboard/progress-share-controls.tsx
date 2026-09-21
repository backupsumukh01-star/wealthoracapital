'use client'

import { useState } from 'react'
import { Copy, Download, Eye, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import {
  progressShareService,
  type ProgressShareKind,
  type ProgressShareLink,
} from '@/services/progress-share.service'

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

const OPTIONS: {
  kind: ProgressShareKind
  title: string
  description: string
  shareText: string
  file: string
}[] = [
  {
    kind: 'journey',
    title: 'Investment Journey',
    description: 'Overall portfolio growth, profit and current value.',
    shareText: 'My investment journey on Wealthora Capital.',
    file: 'wealthora-investment-journey.png',
  },
  {
    kind: 'daily',
    title: "Today's Earnings",
    description: "Today's earning, daily return and today's performance.",
    shareText: "Today's earnings on Wealthora Capital.",
    file: 'wealthora-todays-earnings.png',
  },
]

export function ProgressShareControls({
  compact = false,
}: {
  compact?: boolean
}) {
  const [link, setLink] = useState<ProgressShareLink | null>(null)
  const [preview, setPreview] = useState<{ kind: ProgressShareKind; url: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function ensureLink() {
    if (link) return link
    const created = await progressShareService.createLink()
    setLink(created)
    return created
  }

  function urlsFor(kind: ProgressShareKind, created: ProgressShareLink) {
    return {
      imageUrl: kind === 'daily' ? created.dailyImageUrl : created.journeyImageUrl,
      shareUrl: kind === 'daily' ? created.dailyShareUrl : created.journeyShareUrl,
    }
  }

  async function onPreview(kind: ProgressShareKind) {
    setBusy(`preview-${kind}`)
    try {
      const created = await ensureLink()
      const { imageUrl } = urlsFor(kind, created)
      const blob = await progressShareService.fetchImageBlob({ imageUrl })
      const url = URL.createObjectURL(blob)
      setPreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url)
        return { kind, url }
      })
    } catch {
      toast.error('Could not load preview')
    } finally {
      setBusy(null)
    }
  }

  async function onDownload(kind: ProgressShareKind, filename: string) {
    setBusy(`download-${kind}`)
    try {
      const created = await ensureLink()
      const { imageUrl } = urlsFor(kind, created)
      const blob = await progressShareService.fetchImageBlob({ imageUrl })
      downloadBlob(blob, filename)
      toast.success('Image downloaded')
    } catch {
      toast.error('Could not download image')
    } finally {
      setBusy(null)
    }
  }

  async function onCopy(kind: ProgressShareKind) {
    setBusy(`link-${kind}`)
    try {
      const created = await ensureLink()
      const { shareUrl } = urlsFor(kind, created)
      const ok = await copyText(shareUrl)
      if (ok) toast.success('Share link copied')
      else toast.error('Could not copy link')
    } catch {
      toast.error('Could not create share link')
    } finally {
      setBusy(null)
    }
  }

  async function onShare(kind: ProgressShareKind, shareText: string, filename: string) {
    setBusy(`share-${kind}`)
    try {
      const created = await ensureLink()
      const { imageUrl, shareUrl } = urlsFor(kind, created)
      const blob = await progressShareService.fetchImageBlob({ imageUrl })
      const file = new File([blob], filename, { type: 'image/png' })

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ title: 'Wealthora Capital', text: shareText, files: [file] })
            return
          }
          await navigator.share({ title: 'Wealthora Capital', text: shareText, url: shareUrl })
          return
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
        }
      }

      downloadBlob(blob, filename)
      const ok = await copyText(shareUrl)
      if (ok) toast.success('Image downloaded and link copied')
      else toast.success('Image downloaded')
    } catch {
      toast.error('Could not share progress')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card padded="md" className="space-y-4">
      <div>
        <p className="text-overline text-accent-300">Share My Progress</p>
        <p className="mt-1 text-body-sm text-fg-muted">
          Share your investment journey or today&apos;s earnings.
        </p>
      </div>
      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {OPTIONS.map((option) => (
          <div
            key={option.kind}
            className="space-y-3 rounded-2xl border border-line-default bg-inset/40 p-4"
          >
            <div>
              <p className="text-heading-sm text-fg">{option.title}</p>
              <p className="mt-1 text-caption text-fg-muted">{option.description}</p>
            </div>
            {preview?.kind === option.kind ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url}
                alt={`${option.title} preview`}
                className="w-full rounded-xl border border-white/10"
                width={1080}
                height={1920}
              />
            ) : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                fullWidth
                loading={busy === `preview-${option.kind}`}
                onClick={() => void onPreview(option.kind)}
              >
                <Eye aria-hidden />
                Preview
              </Button>
              <Button
                type="button"
                size="sm"
                fullWidth
                loading={busy === `share-${option.kind}`}
                onClick={() => void onShare(option.kind, option.shareText, option.file)}
              >
                <Share2 aria-hidden />
                Share
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                fullWidth
                loading={busy === `download-${option.kind}`}
                onClick={() => void onDownload(option.kind, option.file)}
              >
                <Download aria-hidden />
                Download
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                fullWidth
                loading={busy === `link-${option.kind}`}
                onClick={() => void onCopy(option.kind)}
              >
                <Copy aria-hidden />
                Copy link
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
