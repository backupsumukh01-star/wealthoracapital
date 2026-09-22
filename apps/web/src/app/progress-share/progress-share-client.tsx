'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { API_ROUTES, ROUTES } from '@meridian/shared'
import { Copy, Download, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { env } from '@/lib/env'
import {
  progressShareService,
  type ProgressShareKind,
  type ProgressShareSnapshot,
} from '@/services/progress-share.service'

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export default function ProgressSharePage() {
  const params = useSearchParams()
  const token = params.get('t')?.trim() || ''
  // Honor explicit kind=journey for existing public URLs; investor UI no longer offers Journey.
  const kind: ProgressShareKind = params.get('kind') === 'journey' ? 'journey' : 'daily'
  const [snapshot, setSnapshot] = useState<ProgressShareSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(token))

  const imageUrl = useMemo(() => {
    if (!token) return null
    return `${env.NEXT_PUBLIC_API_URL}${API_ROUTES.progressShare.image}?t=${encodeURIComponent(token)}&kind=${kind}`
  }, [token, kind])

  const shareUrl =
    typeof window !== 'undefined' && token
      ? `${window.location.origin}${ROUTES.dashboard.progressShare}?t=${encodeURIComponent(token)}&kind=daily`
      : null

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setError('This share link is missing or incomplete.')
      return
    }
    let cancelled = false
    setLoading(true)
    progressShareService
      .snapshot(token)
      .then((data) => {
        if (!cancelled) {
          setSnapshot(data)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSnapshot(null)
          setError('This share link is invalid or has expired.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  async function onDownload() {
    if (!token) return
    try {
      const blob = await progressShareService.fetchImageBlob({ token, kind: 'daily' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'wealthora-todays-earnings.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Progress image downloaded')
    } catch {
      toast.error('Could not download image')
    }
  }

  async function onCopy() {
    if (!shareUrl) return
    const ok = await copyText(shareUrl)
    if (ok) toast.success('Share link copied')
    else toast.error('Could not copy link')
  }

  async function onShare() {
    if (!token || !shareUrl) return
    try {
      const blob = await progressShareService.fetchImageBlob({ token, kind: 'daily' })
      const file = new File([blob], 'wealthora-todays-earnings.png', { type: 'image/png' })
      if (typeof navigator.share === 'function') {
        try {
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              title: 'Wealthora Capital',
              text: "Today's earnings on Wealthora Capital.",
              files: [file],
            })
            return
          }
          await navigator.share({
            title: 'Wealthora Capital',
            text: "Today's earnings on Wealthora Capital.",
            url: shareUrl,
          })
          return
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
        }
      }
      await onDownload()
      await onCopy()
    } catch {
      toast.error('Could not share progress')
    }
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#0A0D10_0%,#07090B_55%,#050708_100%)] px-4 py-5 text-[#F2F4F7] sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-md space-y-4 sm:max-w-lg sm:space-y-5">
        <header className="space-y-1.5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[#C9A45C]">WEALTHORA CAPITAL</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Share My Progress</h1>
          <p className="text-sm text-[#9AA4B5]">Today&apos;s earnings, daily return and today&apos;s performance.</p>
        </header>

        {loading ? (
          <div className="w-full animate-pulse rounded-2xl bg-white/5" style={{ aspectRatio: '9 / 16' }} />
        ) : error ? (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-[#FFB4B4]">{error}</p>
            <Button asChild size="sm">
              <Link href={ROUTES.auth.login}>Sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={
                  snapshot
                    ? `${snapshot.displayName} today's earnings on Wealthora Capital`
                    : "Wealthora Capital today's earnings"
                }
                className="block h-auto w-full max-w-full rounded-2xl border border-white/10 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.65)]"
                width={1080}
                height={1920}
                decoding="async"
              />
            ) : null}

            {snapshot ? (
              <p className="text-center text-xs text-[#6B7C90]">
                {snapshot.displayName} · USD · as of {snapshot.asOfDate}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button type="button" size="sm" fullWidth onClick={() => void onShare()}>
                <Share2 aria-hidden />
                Share
              </Button>
              <Button type="button" variant="secondary" size="sm" fullWidth onClick={() => void onDownload()}>
                <Download aria-hidden />
                Download image
              </Button>
              <Button type="button" variant="secondary" size="sm" fullWidth onClick={() => void onCopy()}>
                <Copy aria-hidden />
                Copy share link
              </Button>
            </div>
          </>
        )}

        <p className="pt-1 text-center text-xs text-[#6B7C90]">
          <Link href={ROUTES.dashboard.root} className="text-[#D4D9DF] underline-offset-2 hover:underline">
            Open dashboard
          </Link>
        </p>
      </div>
    </main>
  )
}
