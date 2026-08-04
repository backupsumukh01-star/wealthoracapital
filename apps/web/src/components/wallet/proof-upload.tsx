'use client'

import { FileDropzone } from '@/components/ui/file-dropzone'
import { cn } from '@/lib/cn'

/** Thin wrapper so wallet flows share one upload surface for future API hooks. */
export function ProofUpload({
  onFileSelect,
  hint = 'JPG, PNG, WebP or PDF — max size per platform limits.',
  className,
}: {
  onFileSelect?: (file: File) => void
  hint?: string
  className?: string
}) {
  return (
    <div className={cn(className)}>
      <FileDropzone onFileSelect={onFileSelect} hint={hint} />
    </div>
  )
}
