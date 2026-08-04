'use client'

import { useMemo, useState } from 'react'
import { Download, FileUp, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { adminOsId, adminOsNow } from '@/lib/admin-os-store'
import type { MediaAsset, MediaFolder, MediaKind } from '@/lib/admin-cms-extras'
import { cn } from '@/lib/cn'
import { useAdminOs } from '@/providers/admin-os-provider'

const KINDS: Array<MediaKind | 'all'> = [
  'all',
  'image',
  'logo',
  'icon',
  'svg',
  'pdf',
  'video',
  'background',
  'other',
]

const FOLDERS: Array<MediaFolder | 'all'> = [
  'all',
  'Images',
  'Logos',
  'Icons',
  'Documents',
  'PDF',
  'Reports',
  'Email Assets',
  'Landing Assets',
]

function folderForKind(kind: MediaKind): MediaFolder {
  if (kind === 'logo') return 'Logos'
  if (kind === 'icon' || kind === 'svg') return 'Icons'
  if (kind === 'pdf') return 'PDF'
  if (kind === 'background' || kind === 'image') return 'Images'
  return 'Documents'
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function AdminMediaWorkspace() {
  const { state, upsertMedia, removeMedia } = useAdminOs()
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<(typeof KINDS)[number]>('all')
  const [folder, setFolder] = useState<(typeof FOLDERS)[number]>('all')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const pageSize = 8

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return state.media.filter((m) => {
      if (kind !== 'all' && m.kind !== kind) return false
      if (folder !== 'all' && m.folder !== folder) return false
      if (!needle) return true
      return (
        m.name.toLowerCase().includes(needle) ||
        m.mime.toLowerCase().includes(needle) ||
        m.folder.toLowerCase().includes(needle) ||
        (m.usedBy || '').toLowerCase().includes(needle)
      )
    })
  }, [state.media, q, kind, folder])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  async function onUpload(file: File) {
    const reader = new FileReader()
    const url = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      if (file.type.startsWith('image/') || file.type === 'image/svg+xml') reader.readAsDataURL(file)
      else {
        // Non-image: store object URL placeholder metadata (demo)
        resolve(`blob:${file.name}`)
      }
    })

    let mediaKind: MediaKind = 'other'
    if (file.type.startsWith('image/')) mediaKind = file.type.includes('svg') ? 'svg' : 'image'
    else if (file.type === 'application/pdf') mediaKind = 'pdf'
    else if (file.type.startsWith('video/')) mediaKind = 'video'

    const asset: MediaAsset = {
      id: adminOsId('MED'),
      name: file.name.replace(/\.[^.]+$/, ''),
      kind: mediaKind,
      folder: folder !== 'all' ? folder : folderForKind(mediaKind),
      mime: file.type || 'application/octet-stream',
      sizeLabel: formatBytes(file.size),
      url: url.startsWith('blob:') ? '' : url,
      usedBy: 'Unassigned',
      createdAt: adminOsNow(),
      updatedAt: adminOsNow(),
    }
    upsertMedia(asset)
    toast.success('Media uploaded', { description: asset.name })
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Media Manager"
        description="Upload images, icons, PDFs, video, SVG, logos and backgrounds. Preview, rename, delete."
        actions={
          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              className="sr-only"
              accept="image/*,.pdf,video/*,.svg"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onUpload(f).catch(() => toast.error('Upload failed'))
                e.target.value = ''
              }}
            />
            <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-accent-foreground">
              <FileUp className="size-4" aria-hidden />
              Upload
            </span>
          </label>
        }
      />

      <AdminPanel>
        <AdminPanelHeader title="Library" description={`${filtered.length} assets`} />
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center sm:px-5">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              className="pl-9"
              placeholder="Search media…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k)
                  setPage(1)
                }}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize',
                  kind === k
                    ? 'border-accent-500/40 bg-accent-500/15 text-accent-200'
                    : 'border-white/10 text-fg-muted',
                )}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 border-b border-white/[0.06] px-4 pb-4 sm:px-5">
          {FOLDERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFolder(f)
                setPage(1)
              }}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-[11px] font-medium',
                folder === f
                  ? 'border-accent-500/40 bg-accent-500/15 text-accent-200'
                  : 'border-white/10 text-fg-muted',
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          {rows.map((m) => (
            <li
              key={m.id}
              className="overflow-hidden rounded-xl border border-white/8 bg-inset/40"
            >
              <div className="grid h-28 place-items-center bg-[#0a1520]">
                {m.url && m.kind !== 'pdf' && m.kind !== 'video' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="max-h-24 max-w-full object-contain" />
                ) : (
                  <span className="text-caption uppercase tracking-wider text-fg-subtle">{m.kind}</span>
                )}
              </div>
              <div className="space-y-2 p-3">
                <FormField label="Name">
                  <Input
                    value={m.name}
                    onChange={(e) =>
                      upsertMedia({ ...m, name: e.target.value, updatedAt: adminOsNow() })
                    }
                  />
                </FormField>
                <FormField label="Folder">
                  <select
                    className="h-10 w-full rounded-xl border border-white/10 bg-inset/60 px-3 text-caption text-fg"
                    value={m.folder}
                    onChange={(e) =>
                      upsertMedia({
                        ...m,
                        folder: e.target.value as MediaFolder,
                        updatedAt: adminOsNow(),
                      })
                    }
                  >
                    {FOLDERS.filter((f) => f !== 'all').map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </FormField>
                <p className="text-[11px] text-fg-subtle">
                  {m.mime} · {m.sizeLabel} · Used by: {m.usedBy || '—'}
                </p>
                <div className="flex gap-2">
                  {m.url ? (
                    <Button asChild size="sm" variant="glass">
                      <a href={m.url} download={m.name} target="_blank" rel="noreferrer">
                        <Download className="size-3.5" aria-hidden />
                        Preview
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteId(m.id)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 sm:px-5">
          <p className="text-caption text-fg-subtle">
            Page {page} / {pages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="glass"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <Button
              type="button"
              size="sm"
              variant="glass"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </AdminPanel>

      <ConfirmActionDialog
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete media?"
        description="This removes the asset from the CMS library. Published pages using the URL keep the cached URL until republished."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteId) {
            removeMedia(deleteId)
            toast.success('Media deleted')
          }
        }}
      />
    </div>
  )
}
