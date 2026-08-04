'use client'

import { useCallback, useRef, useState, type DragEvent } from 'react'
import { LIMITS } from '@meridian/shared'
import { FileUp, Image as ImageIcon, X } from 'lucide-react'

import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/cn'

import { Button } from './button'

export interface FileDropzoneProps {
  onFileSelect?: (file: File) => void
  accept?: string[]
  maxBytes?: number
  disabled?: boolean
  className?: string
  hint?: string
}

/**
 * Presentation only.
 *
 * The client-side type and size checks below are a courtesy — they save a user a pointless
 * upload. They are not a security control: the server validates by magic bytes, re-encodes the
 * image and strips EXIF before anything is stored (docs/14 §6).
 */
export function FileDropzone({
  onFileSelect,
  accept = [...LIMITS.upload.accept],
  maxBytes = LIMITS.upload.maxBytes,
  disabled,
  className,
  hint,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    (candidate: File) => {
      if (!accept.includes(candidate.type)) {
        setError('That file type is not accepted. Use a JPG, PNG, WebP or PDF.')
        return
      }
      if (candidate.size > maxBytes) {
        setError(`That file is ${formatBytes(candidate.size)}. The limit is ${formatBytes(maxBytes)}.`)
        return
      }
      setError(null)
      setFile(candidate)
      onFileSelect?.(candidate)
    },
    [accept, maxBytes, onFileSelect],
  )

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) handleFile(dropped)
  }

  if (file) {
    return (
      <div className={cn('flex items-center gap-3 rounded-lg border border-line bg-inset p-4', className)}>
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-hover text-fg-subtle">
          <ImageIcon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm text-fg">{file.name}</p>
          <p className="text-caption text-fg-subtle" data-numeric>
            {formatBytes(file.size)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setFile(null)}
          aria-label="Remove file"
        >
          <X aria-hidden />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8',
          'text-center transition-colors duration-[160ms] ease-out-soft',
          isDragging ? 'border-accent bg-accent-900/20' : 'border-line-default bg-inset/50',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <span className="grid size-11 place-items-center rounded-full bg-hover text-fg-subtle">
          <FileUp className="size-5" aria-hidden />
        </span>

        <div className="flex flex-col gap-1">
          <p className="text-body-sm text-fg">Drop your payment proof here</p>
          <p className="text-caption text-fg-subtle">
            {hint ?? `JPG, PNG, WebP or PDF · up to ${formatBytes(maxBytes)}`}
          </p>
        </div>

        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          Choose a file
        </Button>

        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={accept.join(',')}
          disabled={disabled}
          onChange={(event) => {
            const selected = event.target.files?.[0]
            if (selected) handleFile(selected)
          }}
        />
      </div>

      {error ? (
        <p className="text-caption text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
