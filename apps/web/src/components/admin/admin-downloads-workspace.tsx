'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileUp,
  Pencil,
  Search,
  Send,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  useArchiveCmsDownload,
  useCmsDownloads,
  useCreateCmsDownload,
  useDeleteCmsDownload,
  usePublishCmsDownload,
  useReorderCmsDownloads,
  useReplaceCmsDownload,
  useUpdateCmsDownload,
} from '@/features/cms/frontend-hooks'
import { cn } from '@/lib/cn'
import type { CmsDownload, CmsDownloadMeta, CmsDownloadStatus, CmsDownloadVisibility } from '@/services/cms-download.service'

const STATUS_OPTIONS = ['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
const ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/zip,image/*'

function statusTone(status: CmsDownloadStatus): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'PUBLISHED') return 'success'
  if (status === 'DRAFT') return 'warning'
  return 'danger'
}

export function AdminDownloadsWorkspace() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('ALL')
  const [category, setCategory] = useState('ALL')
  const [page, setPage] = useState(1)
  const pageSize = 12

  const listQuery = useMemo(
    () => ({
      q: q.trim() || undefined,
      status: status === 'ALL' ? undefined : status,
      category: category === 'ALL' ? undefined : category,
      page,
      pageSize,
    }),
    [q, status, category, page],
  )

  const { data, isLoading, isError, refetch } = useCmsDownloads(listQuery)
  const createMut = useCreateCmsDownload()
  const updateMut = useUpdateCmsDownload()
  const replaceMut = useReplaceCmsDownload()
  const publishMut = usePublishCmsDownload()
  const archiveMut = useArchiveCmsDownload()
  const deleteMut = useDeleteCmsDownload()
  const reorderMut = useReorderCmsDownloads()

  const [editing, setEditing] = useState<CmsDownload | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [publishId, setPublishId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null)

  const [uploadMeta, setUploadMeta] = useState<CmsDownloadMeta>({
    title: '',
    description: '',
    category: 'General',
    buttonLabel: 'Download',
    version: '1.0',
    visibility: 'PUBLIC',
    status: 'DRAFT',
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const categories = ['ALL', ...(data?.categories ?? [])]

  async function onUpload() {
    if (!uploadFile) {
      toast.error('Choose a file to upload')
      return
    }
    try {
      await createMut.mutateAsync({
        file: uploadFile,
        meta: {
          ...uploadMeta,
          title: uploadMeta.title?.trim() || uploadFile.name.replace(/\.[^.]+$/, ''),
        },
      })
      toast.success('Download uploaded as draft')
      setUploadOpen(false)
      setUploadFile(null)
      setUploadMeta({
        title: '',
        description: '',
        category: 'General',
        buttonLabel: 'Download',
        version: '1.0',
        visibility: 'PUBLIC',
        status: 'DRAFT',
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  async function onSaveEdit() {
    if (!editing) return
    try {
      await updateMut.mutateAsync({
        id: editing.id,
        body: {
          title: editing.title,
          description: editing.description,
          category: editing.category,
          thumbnailUrl: editing.thumbnailUrl,
          buttonLabel: editing.buttonLabel,
          version: editing.version,
          publishDate: editing.publishDate,
          visibility: editing.visibility,
          sortOrder: editing.sortOrder,
        },
      })
      toast.success('Download updated')
      setEditing(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed')
    }
  }

  async function moveRow(id: string, dir: -1 | 1) {
    const ids = items.map((i) => i.id)
    const idx = ids.indexOf(id)
    const next = idx + dir
    if (idx < 0 || next < 0 || next >= ids.length) return
    ;[ids[idx], ids[next]] = [ids[next]!, ids[idx]!]
    try {
      await reorderMut.mutateAsync(ids)
      toast.success('Order updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reorder failed')
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Downloads / Reports"
        description="Upload PDFs, Excel, Word, ZIP, and images. Publish for investors or keep authenticated-only."
        actions={
          <Button type="button" size="sm" onClick={() => setUploadOpen(true)}>
            <FileUp aria-hidden />
            Upload file
          </Button>
        }
      />

      <AdminPanel>
        <AdminPanelHeader title="Library" description={`${total} document${total === 1 ? '' : 's'}`} />
        <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              className="pl-9"
              placeholder="Search title, file, category…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as (typeof STATUS_OPTIONS)[number])
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'ALL' ? 'All statuses' : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === 'ALL' ? 'All categories' : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <div className="p-5">
            <p className="text-caption text-fg-muted">Could not load downloads.</p>
            <Button type="button" variant="glass" size="sm" className="mt-2" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="p-5 text-caption text-fg-subtle">No downloads match your filters.</p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {items.map((row) => (
              <li
                key={row.id}
                className={cn(
                  'flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5',
                  editing?.id === row.id && 'bg-accent-900/10',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-body-sm font-medium text-fg">{row.title}</p>
                    <Badge tone={statusTone(row.status)} size="sm">
                      {row.status}
                    </Badge>
                    <Badge tone="outline" size="sm">
                      {row.visibility}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-caption text-fg-subtle">
                    {row.fileName} · {row.sizeLabel} · {row.category} · v{row.version}
                  </p>
                  <p className="mt-0.5 text-[11px] text-fg-subtle">
                    {row.downloadCount} downloads
                    {row.createdByName ? ` · by ${row.createdByName}` : ''}
                    {' · '}
                    updated {row.updatedAt.slice(0, 16).replace('T', ' ')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => moveRow(row.id, -1)}
                    aria-label="Move up"
                  >
                    <ChevronUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => moveRow(row.id, 1)}
                    aria-label="Move down"
                  >
                    <ChevronDown className="size-3.5" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" asChild>
                    <a href={row.url} target="_blank" rel="noreferrer">
                      <Eye className="size-3.5" />
                    </a>
                  </Button>
                  <Button type="button" size="sm" variant="ghost" asChild>
                    <a href={row.url} download={row.fileName}>
                      <Download className="size-3.5" />
                    </a>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(structuredClone(row))}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setReplaceTargetId(row.id)
                      replaceInputRef.current?.click()
                    }}
                  >
                    <FileUp className="size-3.5" />
                  </Button>
                  {row.status !== 'PUBLISHED' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="glass"
                      onClick={() => setPublishId(row.id)}
                    >
                      <Send className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void archiveMut.mutateAsync(row.id).then(
                          () => toast.success('Archived'),
                          (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
                        )
                      }}
                    >
                      <Archive className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteId(row.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 sm:px-5">
            <p className="text-caption text-fg-subtle">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="glass"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="glass"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </AdminPanel>

      {editing ? (
        <AdminPanel>
          <AdminPanelHeader
            title="Edit download"
            description={editing.fileName}
            action={
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={updateMut.isPending}
                  onClick={() => void onSaveEdit()}
                >
                  Save
                </Button>
              </div>
            }
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <FormField label="Title">
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </FormField>
            <FormField label="Category">
              <Input
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              />
            </FormField>
            <FormField label="Description" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={editing.description ?? ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </FormField>
            <FormField label="Thumbnail URL">
              <Input
                value={editing.thumbnailUrl ?? ''}
                onChange={(e) => setEditing({ ...editing, thumbnailUrl: e.target.value || null })}
              />
            </FormField>
            <FormField label="Button label">
              <Input
                value={editing.buttonLabel}
                onChange={(e) => setEditing({ ...editing, buttonLabel: e.target.value })}
              />
            </FormField>
            <FormField label="Version">
              <Input
                value={editing.version}
                onChange={(e) => setEditing({ ...editing, version: e.target.value })}
              />
            </FormField>
            <FormField label="Publish date">
              <Input
                type="date"
                value={editing.publishDate?.slice(0, 10) ?? ''}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    publishDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
              />
            </FormField>
            <FormField label="Visibility">
              <Select
                value={editing.visibility}
                onValueChange={(v) =>
                  setEditing({ ...editing, visibility: v as CmsDownloadVisibility })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                  <SelectItem value="AUTHENTICATED">AUTHENTICATED</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Sort order">
              <Input
                type="number"
                value={editing.sortOrder}
                onChange={(e) =>
                  setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })
                }
              />
            </FormField>
          </div>
        </AdminPanel>
      ) : null}

      {uploadOpen ? (
        <AdminPanel glow>
          <AdminPanelHeader
            title="Upload download"
            description="PDF, Word, Excel, ZIP, or image · max 40 MB"
            action={
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setUploadOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={createMut.isPending}
                  onClick={() => void onUpload()}
                >
                  Upload
                </Button>
              </div>
            }
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <FormField label="File" className="sm:col-span-2">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="block w-full text-caption text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent-900/40 file:px-3 file:py-1.5 file:text-caption file:text-accent-200"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    setUploadFile(f)
                    if (f && !uploadMeta.title) {
                      setUploadMeta((m) => ({
                        ...m,
                        title: f.name.replace(/\.[^.]+$/, ''),
                      }))
                    }
                  }}
                />
                {uploadFile ? (
                  <p className="mt-1 text-[11px] text-fg-subtle">
                    {uploadFile.name} · {(uploadFile.size / 1024).toFixed(0)} KB
                  </p>
                ) : null}
              </div>
            </FormField>
            <FormField label="Title">
              <Input
                value={uploadMeta.title ?? ''}
                onChange={(e) => setUploadMeta((m) => ({ ...m, title: e.target.value }))}
              />
            </FormField>
            <FormField label="Category">
              <Input
                value={uploadMeta.category ?? 'General'}
                onChange={(e) => setUploadMeta((m) => ({ ...m, category: e.target.value }))}
              />
            </FormField>
            <FormField label="Description" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={uploadMeta.description ?? ''}
                onChange={(e) => setUploadMeta((m) => ({ ...m, description: e.target.value }))}
              />
            </FormField>
            <FormField label="Thumbnail URL">
              <Input
                value={uploadMeta.thumbnailUrl ?? ''}
                onChange={(e) => setUploadMeta((m) => ({ ...m, thumbnailUrl: e.target.value }))}
              />
            </FormField>
            <FormField label="Button label">
              <Input
                value={uploadMeta.buttonLabel ?? 'Download'}
                onChange={(e) => setUploadMeta((m) => ({ ...m, buttonLabel: e.target.value }))}
              />
            </FormField>
            <FormField label="Version">
              <Input
                value={uploadMeta.version ?? '1.0'}
                onChange={(e) => setUploadMeta((m) => ({ ...m, version: e.target.value }))}
              />
            </FormField>
            <FormField label="Visibility">
              <Select
                value={uploadMeta.visibility ?? 'PUBLIC'}
                onValueChange={(v) =>
                  setUploadMeta((m) => ({ ...m, visibility: v as CmsDownloadVisibility }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                  <SelectItem value="AUTHENTICATED">AUTHENTICATED</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </AdminPanel>
      ) : null}

      <input
        ref={replaceInputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          const id = replaceTargetId
          e.target.value = ''
          setReplaceTargetId(null)
          if (!file || !id) return
          void replaceMut.mutateAsync({ id, file }).then(
            () => toast.success('File replaced'),
            (err) => toast.error(err instanceof Error ? err.message : 'Replace failed'),
          )
        }}
      />

      <ConfirmActionDialog
        open={Boolean(publishId)}
        onOpenChange={(open) => !open && setPublishId(null)}
        title="Publish download?"
        description="This file will appear on public download surfaces for investors."
        confirmLabel="Publish"
        onConfirm={() => {
          if (!publishId) return
          void publishMut.mutateAsync(publishId).then(
            () => {
              toast.success('Published')
              setPublishId(null)
            },
            (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
          )
        }}
      />

      <ConfirmActionDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete download?"
        description="The file will be soft-deleted and removed from public lists."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (!deleteId) return
          void deleteMut.mutateAsync(deleteId).then(
            () => {
              toast.success('Deleted')
              setDeleteId(null)
            },
            (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
          )
        }}
      />
    </div>
  )
}
