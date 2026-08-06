'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { CmsMediaUrlField } from '@/components/admin/cms-media-url-field'
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  useFrontendCmsDocument,
  useFrontendCmsRevisions,
  usePublishFrontend,
  useSaveFrontendDraft,
} from '@/features/cms/frontend-hooks'
import { cn } from '@/lib/cn'
import { cmsService, type CmsFaq, type CmsTestimonial } from '@/services/cms.service'
import type { FrontendCmsDocument, FrontendSection, FrontendSectionItem } from '@/types/domain'

function newItemId() {
  return `item_${Math.random().toString(36).slice(2, 10)}`
}

function sortSections(sections: FrontendSection[]) {
  return [...sections].sort((a, b) => a.order - b.order)
}

function withReorderedOrders(sections: FrontendSection[]): FrontendSection[] {
  return sortSections(sections).map((s, i) => ({ ...s, order: i }))
}

export function AdminFrontendManagementWorkspace() {
  const { data, isLoading, isError, refetch } = useFrontendCmsDocument()
  const { data: revisions } = useFrontendCmsRevisions()
  const saveDraft = useSaveFrontendDraft()
  const publish = usePublishFrontend()

  const [draft, setDraft] = useState<FrontendCmsDocument | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [dirty, setDirty] = useState(false)

  const [faqs, setFaqs] = useState<CmsFaq[]>([])
  const [testimonials, setTestimonials] = useState<CmsTestimonial[]>([])

  useEffect(() => {
    if (data && !dirty) {
      setDraft(structuredClone(data))
      if (!selectedId && data.sections[0]) setSelectedId(data.sections[0].id)
    }
  }, [data, dirty, selectedId])

  useEffect(() => {
    void cmsService.faqs.list().then((r) => setFaqs(r.items)).catch(() => undefined)
    void cmsService.testimonials.list().then((r) => setTestimonials(r.items)).catch(() => undefined)
  }, [])

  const sections = useMemo(
    () => (draft ? sortSections(draft.sections) : []),
    [draft],
  )

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return sections
    return sections.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.key.toLowerCase().includes(q) ||
        (s.title ?? '').toLowerCase().includes(q),
    )
  }, [sections, filter])

  const selected = sections.find((s) => s.id === selectedId) ?? filtered[0] ?? null

  function patchDraft(updater: (prev: FrontendCmsDocument) => FrontendCmsDocument) {
    setDraft((prev) => {
      if (!prev) return prev
      setDirty(true)
      return updater(prev)
    })
  }

  function patchSection(id: string, patch: Partial<FrontendSection>) {
    patchDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }

  function moveSection(id: string, dir: -1 | 1) {
    patchDraft((prev) => {
      const sorted = sortSections(prev.sections)
      const idx = sorted.findIndex((s) => s.id === id)
      const next = idx + dir
      if (idx < 0 || next < 0 || next >= sorted.length) return prev
      const copy = [...sorted]
      ;[copy[idx], copy[next]] = [copy[next]!, copy[idx]!]
      return { ...prev, sections: withReorderedOrders(copy) }
    })
  }

  function patchItem(sectionId: string, itemId: string, patch: Partial<FrontendSectionItem>) {
    patchDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s
        return {
          ...s,
          items: (s.items ?? []).map((it) =>
            it.id === itemId ? { ...it, ...patch } : it,
          ),
        }
      }),
    }))
  }

  function addItem(sectionId: string) {
    patchDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s
        return {
          ...s,
          items: [...(s.items ?? []), { id: newItemId(), title: 'New item', description: '' }],
        }
      }),
    }))
  }

  function removeItem(sectionId: string, itemId: string) {
    patchDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s
        return { ...s, items: (s.items ?? []).filter((it) => it.id !== itemId) }
      }),
    }))
  }

  function moveItem(sectionId: string, itemId: string, dir: -1 | 1) {
    patchDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s
        const items = [...(s.items ?? [])]
        const idx = items.findIndex((it) => it.id === itemId)
        const next = idx + dir
        if (idx < 0 || next < 0 || next >= items.length) return s
        ;[items[idx], items[next]] = [items[next]!, items[idx]!]
        return { ...s, items }
      }),
    }))
  }

  async function onSave() {
    if (!draft) return
    try {
      const { status: _s, updatedAt: _u, publishedAt: _p, ...content } = draft
      await saveDraft.mutateAsync({
        ...content,
        sections: draft.sections,
        seo: draft.seo,
        social: draft.social,
        contact: draft.contact,
        status: draft.status,
        updatedAt: draft.updatedAt,
        publishedAt: draft.publishedAt,
      } as unknown as Record<string, unknown>)
      setDirty(false)
      toast.success('Frontend draft saved')
      void refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function onPublish() {
    if (!draft) return
    try {
      const payload = {
        sections: draft.sections,
        seo: draft.seo,
        social: draft.social,
        contact: draft.contact,
        status: draft.status,
        updatedAt: draft.updatedAt,
        publishedAt: draft.publishedAt,
      }
      await publish.mutateAsync(payload as unknown as Record<string, unknown>)
      setDirty(false)
      setConfirmPublish(false)
      toast.success('Frontend published')
      void refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publish failed')
    }
  }

  if (isLoading || !draft) {
    return (
      <div className="space-y-6">
        <PageHeader title="Frontend Management" description="Loading section map…" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Frontend Management" description="Could not load frontend CMS." />
        <Button type="button" variant="glass" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const isSeo = selected?.key === 'seo'
  const isSocial = selected?.key === 'social_links'
  const isContact = selected?.key === 'contact'
  const useCmsTestimonials = Boolean(selected?.meta?.useCmsTestimonials)
  const useCmsFaqs = Boolean(selected?.meta?.useCmsFaqs)

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Frontend Management"
        description="Edit every homepage section — reorder, hide, draft, then publish live."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={draft.status === 'PUBLISHED' && !dirty ? 'success' : 'warning'} size="sm">
              {dirty ? 'Unsaved' : draft.status}
            </Badge>
            <span className="text-caption text-fg-subtle">
              Updated {draft.updatedAt.slice(0, 16).replace('T', ' ')}
              {data?.version != null ? ` · v${data.version}` : null}
            </span>
            <Button
              type="button"
              variant="glass"
              size="sm"
              disabled={saveDraft.isPending}
              onClick={() => void onSave()}
            >
              <Save aria-hidden />
              Save draft
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={ROUTES.marketing.home} target="_blank">
                <ExternalLink aria-hidden />
                Live site
              </Link>
            </Button>
            <Button type="button" size="sm" onClick={() => setConfirmPublish(true)}>
              <Send aria-hidden />
              Publish
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        {/* Sidebar */}
        <AdminPanel className="h-fit xl:sticky xl:top-4">
          <AdminPanelHeader title="Sections" description="Search, reorder, show/hide" />
          <div className="space-y-3 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
              <Input
                className="pl-9"
                placeholder="Filter sections…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
              {filtered.map((s) => {
                const active = selected?.id === s.id
                return (
                  <li
                    key={s.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', s.id)
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const fromId = e.dataTransfer.getData('text/plain')
                      if (!fromId || fromId === s.id || !draft) return
                      const ordered = sortSections(draft.sections)
                      const fromIdx = ordered.findIndex((x) => x.id === fromId)
                      const toIdx = ordered.findIndex((x) => x.id === s.id)
                      if (fromIdx < 0 || toIdx < 0) return
                      const next = [...ordered]
                      const [moved] = next.splice(fromIdx, 1)
                      if (!moved) return
                      next.splice(toIdx, 0, moved)
                      patchDraft((p) => ({ ...p, sections: withReorderedOrders(next) }))
                    }}
                  >
                    <div
                      className={cn(
                        'flex cursor-grab items-center gap-1 rounded-xl border px-2 py-1.5 transition-colors active:cursor-grabbing',
                        active
                          ? 'border-accent-700/50 bg-accent-900/30'
                          : 'border-transparent hover:border-white/8 hover:bg-inset/40',
                      )}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setSelectedId(s.id)}
                      >
                        <p className="truncate text-caption font-medium text-fg">{s.label}</p>
                        <p className="truncate text-[11px] text-fg-subtle">{s.key}</p>
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1 text-fg-subtle hover:bg-white/5 hover:text-fg"
                        title={s.visible ? 'Hide' : 'Show'}
                        onClick={() => patchSection(s.id, { visible: !s.visible })}
                      >
                        {s.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1 text-fg-subtle hover:bg-white/5"
                        onClick={() => moveSection(s.id, -1)}
                        aria-label="Move up"
                      >
                        <ChevronUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1 text-fg-subtle hover:bg-white/5"
                        onClick={() => moveSection(s.id, 1)}
                        aria-label="Move down"
                      >
                        <ChevronDown className="size-3.5" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </AdminPanel>

        {/* Editor */}
        <div className="space-y-5">
          {selected ? (
            <AdminPanel>
              <AdminPanelHeader
                title={selected.label}
                description={`Key · ${selected.key}`}
                action={
                  <div className="flex items-center gap-2">
                    <span className="text-caption text-fg-subtle">Visible</span>
                    <Switch
                      checked={selected.visible}
                      onCheckedChange={(v) => patchSection(selected.id, { visible: v })}
                    />
                  </div>
                }
              />
              <div className="grid gap-4 p-4 sm:p-5">
                {isSeo ? (
                  <>
                    <FormField label="Meta title">
                      <Input
                        value={draft.seo.metaTitle}
                        onChange={(e) =>
                          patchDraft((p) => ({ ...p, seo: { ...p.seo, metaTitle: e.target.value } }))
                        }
                      />
                    </FormField>
                    <FormField label="Meta description">
                      <Textarea
                        rows={3}
                        value={draft.seo.metaDescription}
                        onChange={(e) =>
                          patchDraft((p) => ({
                            ...p,
                            seo: { ...p.seo, metaDescription: e.target.value },
                          }))
                        }
                      />
                    </FormField>
                    <FormField label="OG image URL">
                      <Input
                        value={draft.seo.ogImageUrl}
                        onChange={(e) =>
                          patchDraft((p) => ({ ...p, seo: { ...p.seo, ogImageUrl: e.target.value } }))
                        }
                      />
                    </FormField>
                    <FormField label="Favicon URL">
                      <Input
                        value={draft.seo.faviconUrl}
                        onChange={(e) =>
                          patchDraft((p) => ({ ...p, seo: { ...p.seo, faviconUrl: e.target.value } }))
                        }
                      />
                    </FormField>
                  </>
                ) : isSocial ? (
                  (Object.keys(draft.social) as Array<keyof typeof draft.social>).map((key) => (
                    <FormField key={key} label={key}>
                      <Input
                        value={draft.social[key]}
                        onChange={(e) =>
                          patchDraft((p) => ({
                            ...p,
                            social: { ...p.social, [key]: e.target.value },
                          }))
                        }
                      />
                    </FormField>
                  ))
                ) : isContact ? (
                  (Object.keys(draft.contact) as Array<keyof typeof draft.contact>).map((key) => (
                    <FormField key={key} label={key}>
                      <Input
                        value={draft.contact[key]}
                        onChange={(e) =>
                          patchDraft((p) => ({
                            ...p,
                            contact: { ...p.contact, [key]: e.target.value },
                          }))
                        }
                      />
                    </FormField>
                  ))
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Eyebrow">
                        <Input
                          value={selected.eyebrow ?? ''}
                          onChange={(e) => patchSection(selected.id, { eyebrow: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Title">
                        <Input
                          value={selected.title ?? ''}
                          onChange={(e) => patchSection(selected.id, { title: e.target.value })}
                        />
                      </FormField>
                    </div>
                    <FormField label="Description">
                      <Textarea
                        rows={3}
                        value={selected.description ?? ''}
                        onChange={(e) => patchSection(selected.id, { description: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Body (rich text / HTML)">
                      <Textarea
                        rows={5}
                        value={selected.bodyHtml ?? ''}
                        onChange={(e) => patchSection(selected.id, { bodyHtml: e.target.value })}
                      />
                    </FormField>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField label="Primary CTA">
                        <Input
                          value={selected.primaryCta ?? ''}
                          onChange={(e) => patchSection(selected.id, { primaryCta: e.target.value })}
                        />
                      </FormField>
                      <FormField label="Primary CTA href">
                        <Input
                          value={selected.primaryCtaHref ?? ''}
                          onChange={(e) =>
                            patchSection(selected.id, { primaryCtaHref: e.target.value })
                          }
                        />
                      </FormField>
                      <FormField label="Secondary CTA">
                        <Input
                          value={selected.secondaryCta ?? ''}
                          onChange={(e) =>
                            patchSection(selected.id, { secondaryCta: e.target.value })
                          }
                        />
                      </FormField>
                      <FormField label="Secondary CTA href">
                        <Input
                          value={selected.secondaryCtaHref ?? ''}
                          onChange={(e) =>
                            patchSection(selected.id, { secondaryCtaHref: e.target.value })
                          }
                        />
                      </FormField>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <CmsMediaUrlField
                        label="Image"
                        value={selected.imageUrl ?? ''}
                        onChange={(url) => patchSection(selected.id, { imageUrl: url })}
                      />
                      <CmsMediaUrlField
                        label="Video"
                        value={selected.videoUrl ?? ''}
                        onChange={(url) => patchSection(selected.id, { videoUrl: url })}
                        accept="video/mp4,video/webm"
                      />
                      <CmsMediaUrlField
                        label="Background"
                        value={selected.backgroundUrl ?? ''}
                        onChange={(url) => patchSection(selected.id, { backgroundUrl: url })}
                      />
                      <CmsMediaUrlField
                        label="Logo"
                        value={selected.logoUrl ?? ''}
                        onChange={(url) => patchSection(selected.id, { logoUrl: url })}
                      />
                    </div>
                  </>
                )}

                {/* Items editor */}
                {!isSeo && !isSocial && !isContact && !useCmsTestimonials && !useCmsFaqs ? (
                  <div className="space-y-3 border-t border-white/[0.06] pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-caption font-medium uppercase tracking-wider text-fg-muted">
                        Items
                      </h3>
                      <Button type="button" size="sm" variant="glass" onClick={() => addItem(selected.id)}>
                        <Plus aria-hidden />
                        Add item
                      </Button>
                    </div>
                    {(selected.items ?? []).map((item, idx) => (
                      <div
                        key={item.id ?? idx}
                        className="space-y-2 rounded-xl border border-white/8 bg-inset/30 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-caption text-fg-subtle">#{idx + 1}</span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => moveItem(selected.id, item.id!, -1)}
                            >
                              <ChevronUp className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => moveItem(selected.id, item.id!, 1)}
                            >
                              <ChevronDown className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeItem(selected.id, item.id!)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            placeholder="Title / label"
                            value={String(item.title ?? item.label ?? '')}
                            onChange={(e) =>
                              patchItem(selected.id, item.id!, {
                                title: e.target.value,
                                label: e.target.value,
                              })
                            }
                          />
                          <Input
                            placeholder="Value"
                            value={String(item.value ?? '')}
                            onChange={(e) =>
                              patchItem(selected.id, item.id!, { value: e.target.value })
                            }
                          />
                        </div>
                        <Textarea
                          rows={2}
                          placeholder="Description"
                          value={String(item.description ?? '')}
                          onChange={(e) =>
                            patchItem(selected.id, item.id!, { description: e.target.value })
                          }
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {useCmsTestimonials ? (
                  <TestimonialsMiniEditor
                    items={testimonials}
                    onChange={setTestimonials}
                  />
                ) : null}
                {useCmsFaqs ? <FaqsMiniEditor items={faqs} onChange={setFaqs} /> : null}
              </div>
            </AdminPanel>
          ) : null}

          {revisions && revisions.length > 0 ? (
            <AdminPanel>
              <AdminPanelHeader title="Revisions" description="Recent saves & publishes" />
              <ul className="divide-y divide-white/[0.04]">
                {revisions.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex justify-between gap-3 px-4 py-2.5 text-caption sm:px-5">
                    <span className="text-fg">{r.label ?? r.action ?? 'Revision'}</span>
                    <span className="tabular-nums text-fg-subtle">
                      {r.actorEmail ?? '—'} · {r.createdAt.slice(0, 16).replace('T', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            </AdminPanel>
          ) : null}
        </div>

        {/* Preview */}
        <AdminPanel glow className="h-fit xl:sticky xl:top-4">
          <AdminPanelHeader title="Live preview" description="Selected section" />
          <div className="space-y-3 p-4 sm:p-5">
            {selected ? (
              <>
                {!selected.visible ? (
                  <Badge tone="warning" size="sm">
                    Hidden on public site
                  </Badge>
                ) : null}
                {selected.eyebrow ? (
                  <p className="text-caption uppercase tracking-wider text-accent-300">
                    {selected.eyebrow}
                  </p>
                ) : null}
                {selected.title ? <h2 className="text-heading-sm text-fg">{selected.title}</h2> : null}
                {selected.description ? (
                  <p className="text-body-sm text-fg-muted">{selected.description}</p>
                ) : null}
                {selected.bodyHtml ? (
                  <div
                    className="prose prose-invert max-w-none text-caption text-fg-muted"
                    // CMS-authored HTML preview for operators (trusted admin content).
                    // eslint-disable-next-line react/no-danger -- intentional CMS HTML preview
                    dangerouslySetInnerHTML={{ __html: selected.bodyHtml }}
                  />
                ) : null}
                {(selected.primaryCta || selected.secondaryCta) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selected.primaryCta ? <Button size="sm">{selected.primaryCta}</Button> : null}
                    {selected.secondaryCta ? (
                      <Button size="sm" variant="glass">
                        {selected.secondaryCta}
                      </Button>
                    ) : null}
                  </div>
                )}
                {(selected.items ?? []).length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {(selected.items ?? []).slice(0, 6).map((it, i) => (
                      <li
                        key={it.id ?? i}
                        className="rounded-lg border border-white/8 bg-inset/40 px-3 py-2"
                      >
                        <p className="text-caption font-medium text-fg">
                          {String(it.title ?? it.label ?? 'Item')}
                          {it.value != null && it.value !== '' ? (
                            <span className="ml-2 tabular-nums text-accent-200">
                              {String(it.prefix ?? '')}
                              {String(it.value)}
                              {String(it.suffix ?? '')}
                            </span>
                          ) : null}
                        </p>
                        {it.description ? (
                          <p className="mt-0.5 text-[11px] text-fg-subtle">
                            {String(it.description)}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {selected.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.imageUrl}
                    alt=""
                    className="mt-2 max-h-32 w-full rounded-lg object-cover"
                  />
                ) : null}
              </>
            ) : (
              <p className="text-caption text-fg-subtle">Select a section to preview.</p>
            )}
          </div>
        </AdminPanel>
      </div>

      <ConfirmActionDialog
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
        title="Publish frontend CMS?"
        description="Published content goes live on the marketing site immediately. Draft edits will become the public version."
        confirmLabel={publish.isPending ? 'Publishing…' : 'Publish now'}
        onConfirm={() => void onPublish()}
      />
    </div>
  )
}

function TestimonialsMiniEditor({
  items,
  onChange,
}: {
  items: CmsTestimonial[]
  onChange: (items: CmsTestimonial[]) => void
}) {
  const [form, setForm] = useState({ name: '', quote: '', country: '', rating: 5 })

  async function add() {
    if (!form.name.trim() || !form.quote.trim()) {
      toast.error('Name and quote required')
      return
    }
    try {
      const created = await cmsService.testimonials.create({
        name: form.name.trim(),
        quote: form.quote.trim(),
        country: form.country.trim() || undefined,
        rating: form.rating,
      })
      onChange([...items, created])
      setForm({ name: '', quote: '', country: '', rating: 5 })
      toast.success('Testimonial added')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function toggle(id: string, enabled: boolean) {
    try {
      const updated = await cmsService.testimonials.update(id, { enabled })
      onChange(items.map((t) => (t.id === id ? updated : t)))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function remove(id: string) {
    try {
      await cmsService.testimonials.remove(id)
      onChange(items.filter((t) => t.id !== id))
      toast.success('Removed')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="space-y-3 border-t border-white/[0.06] pt-4">
      <p className="text-caption text-fg-muted">
        Uses CMS Testimonials API — edits apply immediately (separate from frontend draft).
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <Input
          placeholder="Country"
          value={form.country}
          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
        />
      </div>
      <Textarea
        rows={2}
        placeholder="Quote"
        value={form.quote}
        onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
      />
      <Button type="button" size="sm" variant="glass" onClick={() => void add()}>
        <Plus aria-hidden />
        Add testimonial
      </Button>
      <ul className="space-y-2">
        {items.slice(0, 12).map((t) => (
          <li
            key={t.id}
            className="flex items-start justify-between gap-2 rounded-lg border border-white/8 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-caption font-medium text-fg">
                {t.name}
                {t.country ? ` · ${t.country}` : ''}
              </p>
              <p className="line-clamp-2 text-[11px] text-fg-subtle">{t.quote}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Switch checked={t.enabled} onCheckedChange={(v) => void toggle(t.id, v)} />
              <Button type="button" size="sm" variant="ghost" onClick={() => void remove(t.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function FaqsMiniEditor({
  items,
  onChange,
}: {
  items: CmsFaq[]
  onChange: (items: CmsFaq[]) => void
}) {
  const [form, setForm] = useState({ question: '', answer: '' })

  async function add() {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error('Question and answer required')
      return
    }
    try {
      const created = await cmsService.faqs.create({
        question: form.question.trim(),
        answer: form.answer.trim(),
        status: 'PUBLISHED',
      })
      onChange([...items, created])
      setForm({ question: '', answer: '' })
      toast.success('FAQ added')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  async function remove(id: string) {
    try {
      await cmsService.faqs.remove(id)
      onChange(items.filter((f) => f.id !== id))
      toast.success('Removed')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    }
  }

  return (
    <div className="space-y-3 border-t border-white/[0.06] pt-4">
      <p className="text-caption text-fg-muted">
        Uses CMS FAQs API — edits apply immediately (separate from frontend draft).
      </p>
      <Input
        placeholder="Question"
        value={form.question}
        onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
      />
      <Textarea
        rows={2}
        placeholder="Answer"
        value={form.answer}
        onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
      />
      <Button type="button" size="sm" variant="glass" onClick={() => void add()}>
        <Plus aria-hidden />
        Add FAQ
      </Button>
      <ul className="space-y-2">
        {items.slice(0, 12).map((f) => (
          <li
            key={f.id}
            className="flex items-start justify-between gap-2 rounded-lg border border-white/8 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-caption font-medium text-fg">{f.question}</p>
              <p className="line-clamp-2 text-[11px] text-fg-subtle">{f.answer}</p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => void remove(f.id)}>
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
