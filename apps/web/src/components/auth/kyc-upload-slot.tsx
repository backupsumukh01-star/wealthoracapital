'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { RefreshCw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/cn'

/**
 * KYC document slot — drag/drop, file picker, optional camera, preview + retake.
 * Client compresses images for preview; server will re-validate when API ships.
 */
export function KycUploadSlot({
  label,
  icon: Icon,
  file,
  onChange,
  required,
  capture,
  className,
}: {
  label: string
  icon: LucideIcon
  file: File | null
  onChange: (file: File | null) => void
  required?: boolean
  capture?: boolean
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let url: string | null = null
    let cancelled = false
    async function prep() {
      if (!file) {
        setPreview(null)
        return
      }
      if (!file.type.startsWith('image/')) {
        setPreview(null)
        return
      }
      try {
        const compressed = await compressImage(file, 1280, 0.72)
        if (cancelled) return
        url = URL.createObjectURL(compressed)
        setPreview(url)
      } catch {
        if (!cancelled) {
          url = URL.createObjectURL(file)
          setPreview(url)
        }
      }
    }
    void prep()
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [file])

  function acceptFile(candidate: File) {
    const ok =
      candidate.type.startsWith('image/') ||
      candidate.type === 'application/pdf'
    if (!ok) {
      setError('Use JPG, PNG, WebP or PDF.')
      return
    }
    if (candidate.size > 8 * 1024 * 1024) {
      setError('Max file size is 8 MB.')
      return
    }
    setError(null)
    onChange(candidate)
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) acceptFile(f)
    e.target.value = ''
  }

  if (file) {
    return (
      <div className={cn('overflow-hidden rounded-xl border border-line bg-inset', className)}>
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          <p className="text-caption font-medium text-fg">
            {label}
            {required ? <span className="text-danger"> *</span> : null}
          </p>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => inputRef.current?.click()} aria-label="Retake">
              <RefreshCw className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(null)} aria-label="Remove">
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`${label} preview`} className="max-h-48 w-full object-contain bg-black/30" />
        ) : (
          <div className="px-3 py-4 text-caption text-fg-muted">
            {file.name} · {formatBytes(file.size)}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          capture={capture ? 'user' : undefined}
          className="sr-only"
          onChange={onPick}
        />
      </div>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-caption font-medium text-fg">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </p>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files?.[0]
          if (f) acceptFile(f)
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
          dragging ? 'border-accent bg-accent/10' : 'border-line bg-inset/60 hover:border-accent/50',
        )}
      >
        <Icon className="size-5 text-accent-300" aria-hidden />
        <p className="text-body-sm text-fg">Drag & drop or browse</p>
        <p className="text-caption text-fg-subtle">
          {capture ? 'Camera supported · ' : ''}JPG, PNG, WebP, PDF
        </p>
        {capture ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-1"
            onClick={(e) => {
              e.stopPropagation()
              inputRef.current?.click()
            }}
          >
            Take selfie
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-caption text-danger">{error}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture={capture ? 'user' : undefined}
        className="sr-only"
        onChange={onPick}
      />
    </div>
  )
}

async function compressImage(file: File, maxEdge: number, quality: number): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (!blob) return file
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
}
