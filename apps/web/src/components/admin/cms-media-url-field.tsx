'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { mediaService } from '@/services/media.service'

/** URL field + optional media library upload (Landing Assets folder). */
export function CmsMediaUrlField({
  label,
  value,
  onChange,
  accept = 'image/*,video/mp4,video/webm,application/pdf',
  folder = 'Landing Assets',
}: {
  label: string
  value: string
  onChange: (url: string) => void
  accept?: string
  folder?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const asset = await mediaService.upload(file, folder)
      onChange(asset.url)
      toast.success('Uploaded')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <FormField label={label}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          size="sm"
          variant="glass"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="shrink-0"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
          Upload
        </Button>
      </div>
    </FormField>
  )
}
