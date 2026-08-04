'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { AdminPanel, AdminPanelHeader } from '@/components/admin/admin-panel'
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { adminOsId, type TestimonialItem } from '@/lib/admin-os-store'
import { useAdminOs } from '@/providers/admin-os-provider'

export function AdminContentCmsWorkspace() {
  const {
    state,
    updateFaq,
    addFaq,
    removeFaq,
    updateTestimonial,
    upsertTestimonial,
    updatePageBody,
  } = useAdminOs()
  const [pageSlug, setPageSlug] = useState(state.pages[0]?.slug ?? 'about')
  const page = state.pages.find((p) => p.slug === pageSlug)
  const [faqQ, setFaqQ] = useState('')
  const [faqPage, setFaqPage] = useState(0)
  const [testQ, setTestQ] = useState('')
  const [testPage, setTestPage] = useState(0)
  const [editId, setEditId] = useState<string | null>(null)
  const [removeFaqId, setRemoveFaqId] = useState<string | null>(null)
  const pageSize = 5

  const [form, setForm] = useState({
    name: '',
    country: '',
    quote: '',
    rating: 5,
    platform: 'Trustpilot',
    photoUrl: '',
    publishedAt: new Date().toISOString().slice(0, 10),
  })

  const faqs = useMemo(() => {
    const q = faqQ.trim().toLowerCase()
    return state.faqs.filter(
      (f) => !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
    )
  }, [state.faqs, faqQ])

  const testimonials = useMemo(() => {
    const q = testQ.trim().toLowerCase()
    return state.testimonials.filter(
      (t) =>
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.country.toLowerCase().includes(q) ||
        t.quote.toLowerCase().includes(q),
    )
  }, [state.testimonials, testQ])

  const faqSlice = faqs.slice(faqPage * pageSize, faqPage * pageSize + pageSize)
  const testSlice = testimonials.slice(testPage * pageSize, testPage * pageSize + pageSize)
  const editing = editId ? state.testimonials.find((t) => t.id === editId) : null

  function saveTestimonial() {
    if (!form.name.trim() || !form.quote.trim()) {
      toast.error('Name and review are required')
      return
    }
    const item: TestimonialItem = {
      id: editId ?? adminOsId('TST'),
      name: form.name.trim(),
      country: form.country.trim() || 'Global',
      quote: form.quote.trim(),
      rating: Math.min(5, Math.max(1, Number(form.rating) || 5)),
      platform: form.platform || 'Trustpilot',
      enabled: editing?.enabled ?? true,
      photoUrl: form.photoUrl.trim(),
      publishedAt: form.publishedAt
        ? new Date(form.publishedAt).toISOString()
        : new Date().toISOString(),
    }
    upsertTestimonial(item)
    toast.success(editId ? 'Testimonial updated' : 'Testimonial added')
    setEditId(null)
    setForm({
      name: '',
      country: '',
      quote: '',
      rating: 5,
      platform: 'Trustpilot',
      photoUrl: '',
      publishedAt: new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Content CMS"
        description="Edit FAQs, about, terms, privacy, contact, footer, and testimonials — no code."
      />

      <AdminPanel>
        <AdminPanelHeader title="Pages" />
        <div className="grid gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2">
            {state.pages.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={pageSlug === p.slug ? 'primary' : 'glass'}
                onClick={() => setPageSlug(p.slug)}
              >
                {p.title}
              </Button>
            ))}
          </div>
          {page ? (
            <FormField label={page.title}>
              <Textarea
                value={page.body}
                onChange={(e) => updatePageBody(page.slug, e.target.value)}
                rows={8}
              />
            </FormField>
          ) : null}
          <Button type="button" onClick={() => toast.success('Page content saved')}>
            Save page
          </Button>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          title="FAQs"
          action={
            <Button type="button" size="sm" onClick={addFaq}>
              <Plus aria-hidden />
              Add FAQ
            </Button>
          }
        />
        <div className="space-y-4 p-4 sm:p-5">
          <Input
            placeholder="Search FAQs…"
            value={faqQ}
            onChange={(e) => {
              setFaqQ(e.target.value)
              setFaqPage(0)
            }}
            className="max-w-sm"
          />
          {faqSlice.map((f) => (
            <div key={f.id} className="rounded-xl border border-white/8 bg-inset/30 p-4">
              <div className="mb-2 flex justify-end">
                <Button type="button" size="sm" variant="ghost" onClick={() => setRemoveFaqId(f.id)}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <FormField label="Question">
                <Input
                  value={f.question}
                  onChange={(e) => updateFaq(f.id, { question: e.target.value })}
                />
              </FormField>
              <FormField label="Answer" className="mt-3">
                <Textarea
                  value={f.answer}
                  onChange={(e) => updateFaq(f.id, { answer: e.target.value })}
                  rows={3}
                />
              </FormField>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <p className="text-caption text-fg-subtle">
              {faqs.length} FAQs · page {faqPage + 1}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="glass"
                disabled={faqPage <= 0}
                onClick={() => setFaqPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                type="button"
                size="sm"
                variant="glass"
                disabled={(faqPage + 1) * pageSize >= faqs.length}
                onClick={() => setFaqPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          title="Testimonials"
          description="Name, country, photo, review, rating, published date — visible on landing when enabled."
        />
        <div className="grid gap-4 border-b border-white/[0.04] p-4 sm:grid-cols-2 sm:p-5">
          <FormField label="Investor name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Country">
            <Input
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </FormField>
          <FormField label="Photo URL" className="sm:col-span-2">
            <Input
              value={form.photoUrl}
              onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
              placeholder="https://…"
            />
          </FormField>
          <FormField label="Review" className="sm:col-span-2">
            <Textarea
              value={form.quote}
              onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
              rows={3}
            />
          </FormField>
          <FormField label="Rating (1–5)">
            <Input
              type="number"
              min={1}
              max={5}
              value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
            />
          </FormField>
          <FormField label="Platform">
            <Input
              value={form.platform}
              onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
            />
          </FormField>
          <FormField label="Published date">
            <Input
              type="date"
              value={form.publishedAt}
              onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value }))}
            />
          </FormField>
          <div className="flex items-end gap-2">
            <Button type="button" onClick={saveTestimonial}>
              {editId ? 'Update' : 'Add'} testimonial
            </Button>
            {editId ? (
              <Button type="button" variant="ghost" onClick={() => setEditId(null)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
        <div className="px-4 py-3 sm:px-5">
          <Input
            placeholder="Search testimonials…"
            value={testQ}
            onChange={(e) => {
              setTestQ(e.target.value)
              setTestPage(0)
            }}
            className="max-w-sm"
          />
        </div>
        <ul className="divide-y divide-white/[0.04]">
          {testSlice.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="min-w-0">
                <p className="font-medium text-fg">
                  {t.name} · {t.country} · {t.rating}★
                </p>
                <p className="truncate text-caption text-fg-muted">{t.quote}</p>
                <p className="text-caption text-fg-subtle">
                  {t.platform} · {t.publishedAt?.slice(0, 10) || '—'}
                  {t.photoUrl ? ' · photo' : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="glass"
                  onClick={() => {
                    setEditId(t.id)
                    setForm({
                      name: t.name,
                      country: t.country,
                      quote: t.quote,
                      rating: t.rating,
                      platform: t.platform,
                      photoUrl: t.photoUrl || '',
                      publishedAt: (t.publishedAt || '').slice(0, 10),
                    })
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="glass"
                  onClick={() => updateTestimonial(t.id, !t.enabled)}
                >
                  {t.enabled ? 'Visible' : 'Hidden'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between px-4 py-3 sm:px-5">
          <p className="text-caption text-fg-subtle">{testimonials.length} testimonials</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="glass"
              disabled={testPage <= 0}
              onClick={() => setTestPage((p) => p - 1)}
            >
              Prev
            </Button>
            <Button
              type="button"
              size="sm"
              variant="glass"
              disabled={(testPage + 1) * pageSize >= testimonials.length}
              onClick={() => setTestPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </AdminPanel>

      <ConfirmActionDialog
        open={Boolean(removeFaqId)}
        onOpenChange={(o) => !o && setRemoveFaqId(null)}
        title="Delete FAQ?"
        description="This removes the FAQ from the public landing FAQ section."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (!removeFaqId) return
          removeFaq(removeFaqId)
          toast.success('FAQ removed')
          setRemoveFaqId(null)
        }}
      />
    </div>
  )
}
