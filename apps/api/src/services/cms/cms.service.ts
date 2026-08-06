import { Prisma } from '@prisma/client'
import type { CmsDocumentKey, CmsRevisionAction, CmsStatus } from '@prisma/client'

import { prisma } from '../../database/prisma.js'
import { notFound } from '../../utils/errors.js'
import { activityService } from '../activity.service.js'
import { auditService } from '../audit.service.js'
import { settingsService } from '../settings.service.js'
import { defaultFaqs, defaultLandingContent, defaultPlatformContent, defaultTestimonials } from './cms-defaults.js'
import { defaultFrontendContent } from './cms-frontend-defaults.js'

type Ctx = { ip?: string | null; userAgent?: string | null }

async function getOrInitDocument(key: CmsDocumentKey) {
  const existing = await prisma.cmsDocument.findUnique({ where: { key } })
  if (existing) return existing
  const seed =
    key === 'LANDING'
      ? defaultLandingContent()
      : key === 'PLATFORM'
        ? defaultPlatformContent()
        : defaultFrontendContent()
  return prisma.cmsDocument.create({
    data: {
      key,
      status: 'PUBLISHED',
      draftContent: seed as Prisma.InputJsonValue,
      publishedContent: seed as Prisma.InputJsonValue,
      publishedAt: new Date(),
    },
  })
}

async function pushRevision(
  documentKey: CmsDocumentKey,
  action: CmsRevisionAction,
  version: number,
  snapshot: unknown,
  actorId: string | null,
  label?: string,
) {
  await prisma.cmsRevision.create({
    data: {
      documentKey,
      action,
      version,
      label: label ?? null,
      snapshot: snapshot as Prisma.InputJsonValue,
      actorId,
    },
  })
}

function mapDocument(doc: {
  key: CmsDocumentKey
  status: CmsStatus
  draftContent: Prisma.JsonValue
  publishedContent: Prisma.JsonValue | null
  scheduledContent: Prisma.JsonValue | null
  scheduledAt: Date | null
  version: number
  publishedAt: Date | null
  updatedAt: Date
}) {
  return {
    status: doc.status,
    version: doc.version,
    updatedAt: doc.updatedAt.toISOString(),
    publishedAt: doc.publishedAt?.toISOString() ?? null,
    scheduledAt: doc.scheduledAt?.toISOString() ?? null,
    content: doc.draftContent,
    publishedContent: doc.publishedContent,
    scheduledContent: doc.scheduledContent,
  }
}

async function ensureFaqsSeeded() {
  const count = await prisma.cmsFaq.count()
  if (count > 0) return
  await prisma.cmsFaq.createMany({ data: defaultFaqs() })
}

async function ensureTestimonialsSeeded() {
  const count = await prisma.cmsTestimonial.count()
  if (count > 0) return
  await prisma.cmsTestimonial.createMany({ data: defaultTestimonials() })
}

/** Map Frontend Management publish → LANDING document fields consumed by Hero/Footer. */
async function syncLandingFromFrontend(frontend: Record<string, unknown>, actorId: string) {
  const sections = Array.isArray(frontend.sections) ? frontend.sections : []
  const byKey = (key: string) =>
    sections.find((s) => s && typeof s === 'object' && (s as { key?: string }).key === key) as
      | Record<string, unknown>
      | undefined

  const hero = byKey('hero')
  const footer = byKey('footer')
  const performance = byKey('performance')
  const social = (frontend.social ?? {}) as Record<string, string>
  const contact = (frontend.contact ?? {}) as Record<string, string>
  const seo = (frontend.seo ?? {}) as Record<string, string>
  const heroMeta = (hero?.meta ?? {}) as Record<string, unknown>
  const perfItems = Array.isArray(performance?.items) ? performance!.items : []

  const pickPerf = (label: string) => {
    const row = perfItems.find(
      (i) =>
        i &&
        typeof i === 'object' &&
        String((i as { label?: string }).label ?? '')
          .toLowerCase()
          .includes(label.toLowerCase()),
    ) as { value?: string } | undefined
    return row?.value
  }

  const landing = await getOrInitDocument('LANDING')
  const prev = (landing.publishedContent ?? landing.draftContent ?? {}) as Record<string, unknown>
  const prevSocial = (prev.social ?? {}) as Record<string, string>
  const prevMotion = (prev.heroMotion ?? {}) as Record<string, unknown>

  const next = {
    ...prev,
    companyName: String(heroMeta.companyName ?? prev.companyName ?? 'Growzy'),
    logoUrl: String(hero?.logoUrl ?? prev.logoUrl ?? ''),
    heroTitle: String(hero?.title ?? prev.heroTitle ?? ''),
    heroSubtitle: String(hero?.description ?? prev.heroSubtitle ?? ''),
    heroPrimaryCta: String(hero?.primaryCta ?? prev.heroPrimaryCta ?? ''),
    heroSecondaryCta: String(hero?.secondaryCta ?? prev.heroSecondaryCta ?? ''),
    heroBannerUrl: String(hero?.imageUrl || hero?.backgroundUrl || prev.heroBannerUrl || ''),
    avgMonthlyReturn: String(pickPerf('monthly') ?? prev.avgMonthlyReturn ?? ''),
    winRate: String(pickPerf('win') ?? prev.winRate ?? ''),
    aum: String(pickPerf('aum') ?? prev.aum ?? ''),
    bestDay: String(pickPerf('best') ?? prev.bestDay ?? ''),
    footerTagline: String(footer?.description ?? prev.footerTagline ?? ''),
    supportEmail: String(contact.supportEmail ?? prev.supportEmail ?? ''),
    whatsapp: String(social.whatsapp ?? prev.whatsapp ?? ''),
    telegram: String(social.telegram ?? prev.telegram ?? ''),
    social: {
      ...prevSocial,
      twitter: social.twitter ?? prevSocial.twitter ?? '',
      linkedin: social.linkedin ?? prevSocial.linkedin ?? '',
      facebook: social.facebook ?? prevSocial.facebook ?? '',
      instagram: social.instagram ?? prevSocial.instagram ?? '',
      discord: social.discord ?? prevSocial.discord ?? '',
    },
    heroMotion: {
      ...prevMotion,
      particlesEnabled:
        heroMeta.particlesEnabled !== undefined
          ? Boolean(heroMeta.particlesEnabled)
          : prevMotion.particlesEnabled !== false,
      glowEnabled:
        heroMeta.glowEnabled !== undefined
          ? Boolean(heroMeta.glowEnabled)
          : prevMotion.glowEnabled !== false,
      intensity:
        typeof heroMeta.intensity === 'number'
          ? heroMeta.intensity
          : typeof prevMotion.intensity === 'number'
            ? prevMotion.intensity
            : 1,
    },
    metaTitle: seo.metaTitle ?? (prev as { metaTitle?: string }).metaTitle,
    metaDescription: seo.metaDescription ?? (prev as { metaDescription?: string }).metaDescription,
    status: 'PUBLISHED',
    updatedAt: new Date().toISOString(),
  }

  const nextVersion = landing.version + 1
  await prisma.cmsDocument.update({
    where: { key: 'LANDING' },
    data: {
      draftContent: next as Prisma.InputJsonValue,
      publishedContent: next as Prisma.InputJsonValue,
      status: 'PUBLISHED',
      version: nextVersion,
      publishedAt: new Date(),
      updatedById: actorId,
    },
  })
  await pushRevision('LANDING', 'PUBLISH', nextVersion, next, actorId, 'Synced from Frontend Management')
}

export const cmsService = {
  async publicBootstrap() {
    const [landing, platform, frontend] = await Promise.all([
      getOrInitDocument('LANDING'),
      getOrInitDocument('PLATFORM'),
      getOrInitDocument('FRONTEND'),
    ])
    await Promise.all([ensureFaqsSeeded(), ensureTestimonialsSeeded()])

    const [faqs, testimonials, flags, settings, downloads] = await Promise.all([
      prisma.cmsFaq.findMany({ where: { status: 'PUBLISHED', deletedAt: null }, orderBy: { order: 'asc' } }),
      prisma.cmsTestimonial.findMany({ where: { enabled: true, deletedAt: null }, orderBy: { order: 'asc' } }),
      prisma.featureFlag.findMany(),
      settingsService.getOrInitPlatformSettings(),
      prisma.cmsDownload.findMany({
        where: { status: 'PUBLISHED', deletedAt: null, archivedAt: null, visibility: 'PUBLIC' },
        orderBy: [{ sortOrder: 'asc' }, { publishDate: 'desc' }],
      }),
    ])

    return {
      landing: landing.publishedContent ?? landing.draftContent,
      platform: platform.publishedContent ?? platform.draftContent,
      frontend: frontend.publishedContent ?? frontend.draftContent,
      faqs: faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
      testimonials: testimonials.map((t) => ({
        id: t.id,
        name: t.name,
        country: t.country,
        quote: t.quote,
        rating: t.rating,
        platform: t.platform,
        photoUrl: t.photoUrl,
      })),
      downloads: downloads.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        category: d.category,
        thumbnailUrl: d.thumbnailUrl,
        buttonLabel: d.buttonLabel,
        version: d.version,
        publishDate: d.publishDate?.toISOString() ?? null,
        fileName: d.fileName,
        mimeType: d.mimeType,
        sizeBytes: d.sizeBytes,
        url: d.url,
        sortOrder: d.sortOrder,
      })),
      siteSeo: {
        websiteName: settings.companyName,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        defaultLanguage: 'en',
      },
      featureFlags: Object.fromEntries(flags.map((f) => [f.key, f.enabled])),
    }
  },

  async getDocument(key: CmsDocumentKey) {
    return mapDocument(await getOrInitDocument(key))
  },

  async updateDraft(key: CmsDocumentKey, actorId: string, content: Record<string, unknown>, _context: Ctx) {
    const existing = await getOrInitDocument(key)
    const updated = await prisma.cmsDocument.update({
      where: { key },
      data: {
        draftContent: content as Prisma.InputJsonValue,
        status: existing.status === 'PUBLISHED' ? 'DRAFT' : existing.status,
        updatedById: actorId,
      },
    })
    await pushRevision(key, 'SAVE', updated.version, content, actorId, 'Draft saved')
    return mapDocument(updated)
  },

  async autosaveDraft(key: CmsDocumentKey, actorId: string, content: Record<string, unknown>) {
    const updated = await prisma.cmsDocument.update({
      where: { key },
      data: { draftContent: content as Prisma.InputJsonValue, updatedById: actorId },
    })
    await pushRevision(key, 'AUTOSAVE', updated.version, content, actorId, 'Autosave')
    return mapDocument(updated)
  },

  async publish(key: CmsDocumentKey, actorId: string, content: Record<string, unknown> | undefined, context: Ctx) {
    const existing = await getOrInitDocument(key)
    const nextContent = content ?? existing.draftContent
    const nextVersion = existing.version + 1
    const updated = await prisma.cmsDocument.update({
      where: { key },
      data: {
        draftContent: nextContent as Prisma.InputJsonValue,
        publishedContent: nextContent as Prisma.InputJsonValue,
        status: 'PUBLISHED',
        version: nextVersion,
        publishedAt: new Date(),
        scheduledAt: null,
        scheduledContent: Prisma.JsonNull,
        updatedById: actorId,
      },
    })
    await pushRevision(key, 'PUBLISH', nextVersion, nextContent, actorId, `Published v${nextVersion}`)

    // Keep classic Landing CMS in sync so Hero / footer / social update without code.
    if (key === 'FRONTEND') {
      await syncLandingFromFrontend(nextContent as Record<string, unknown>, actorId)
    }

    await activityService.record({
      userId: actorId,
      actorId,
      kind: 'CMS_PUBLISHED',
      title: `CMS ${key} published`,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await auditService.record({
      actorId,
      action: 'cms.publish',
      module: 'cms',
      newValue: { key, version: nextVersion },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapDocument(updated)
  },

  async schedule(key: CmsDocumentKey, actorId: string, content: Record<string, unknown>, scheduledAt: Date, context: Ctx) {
    const existing = await getOrInitDocument(key)
    const updated = await prisma.cmsDocument.update({
      where: { key },
      data: {
        scheduledContent: content as Prisma.InputJsonValue,
        scheduledAt,
        status: existing.status === 'PUBLISHED' ? 'SCHEDULED' : existing.status,
        updatedById: actorId,
      },
    })
    await pushRevision(key, 'SCHEDULE', updated.version, content, actorId, `Scheduled for ${scheduledAt.toISOString()}`)
    await activityService.record({
      userId: actorId,
      actorId,
      kind: 'CMS_SCHEDULED',
      title: `CMS ${key} scheduled`,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapDocument(updated)
  },

  /** Invoked by the job queue — publishes any document whose scheduled time has passed. */
  async processScheduledPublishes(): Promise<number> {
    const due = await prisma.cmsDocument.findMany({
      where: { scheduledAt: { lte: new Date() }, scheduledContent: { not: Prisma.JsonNull } },
    })
    for (const doc of due) {
      const content = (doc.scheduledContent ?? doc.draftContent) as Record<string, unknown>
      await this.publish(doc.key, doc.updatedById ?? 'system', content, {})
    }
    return due.length
  },

  async rollback(revisionId: string, actorId: string, context: Ctx) {
    const revision = await prisma.cmsRevision.findUnique({ where: { id: revisionId } })
    if (!revision) throw notFound('CMS revision not found.')
    const doc = await getOrInitDocument(revision.documentKey)
    const nextVersion = doc.version + 1
    const updated = await prisma.cmsDocument.update({
      where: { key: revision.documentKey },
      data: {
        draftContent: revision.snapshot as Prisma.InputJsonValue,
        publishedContent: revision.snapshot as Prisma.InputJsonValue,
        status: 'PUBLISHED',
        version: nextVersion,
        publishedAt: new Date(),
        updatedById: actorId,
      },
    })
    await pushRevision(
      revision.documentKey,
      'ROLLBACK',
      nextVersion,
      revision.snapshot,
      actorId,
      `Rolled back to v${revision.version}`,
    )
    await activityService.record({
      userId: actorId,
      actorId,
      kind: 'CMS_ROLLBACK',
      title: `CMS ${revision.documentKey} rolled back`,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await auditService.record({
      actorId,
      action: 'cms.rollback',
      module: 'cms',
      newValue: { key: revision.documentKey, revisionId },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return mapDocument(updated)
  },

  async listRevisions(key: CmsDocumentKey, limit = 50) {
    const rows = await prisma.cmsRevision.findMany({
      where: { documentKey: key },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((r) => ({
      id: r.id,
      documentKey: r.documentKey,
      action: r.action,
      version: r.version,
      label: r.label,
      actorId: r.actorId,
      createdAt: r.createdAt.toISOString(),
    }))
  },

  async listPublishLogs(limit = 100) {
    const rows = await prisma.cmsRevision.findMany({
      where: { action: { in: ['PUBLISH', 'ROLLBACK', 'SCHEDULE'] } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((r) => ({
      id: r.id,
      documentKey: r.documentKey,
      action: r.action,
      version: r.version,
      label: r.label,
      actorId: r.actorId,
      createdAt: r.createdAt.toISOString(),
    }))
  },

  // ---- FAQs -----------------------------------------------------------
  async listFaqs(includeDeleted = false) {
    await ensureFaqsSeeded()
    const rows = await prisma.cmsFaq.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { order: 'asc' },
    })
    return rows
  },
  createFaq(body: { question: string; answer: string; category?: string; order?: number; status?: CmsStatus }) {
    return prisma.cmsFaq.create({ data: body })
  },
  async updateFaq(id: string, body: Partial<{ question: string; answer: string; category: string | null; order: number; status: CmsStatus }>) {
    const existing = await prisma.cmsFaq.findUnique({ where: { id } })
    if (!existing) throw notFound('FAQ not found.')
    return prisma.cmsFaq.update({ where: { id }, data: body })
  },
  async softDeleteFaq(id: string) {
    const existing = await prisma.cmsFaq.findUnique({ where: { id } })
    if (!existing) throw notFound('FAQ not found.')
    return prisma.cmsFaq.update({ where: { id }, data: { deletedAt: new Date() } })
  },
  async restoreFaq(id: string) {
    const existing = await prisma.cmsFaq.findUnique({ where: { id } })
    if (!existing) throw notFound('FAQ not found.')
    return prisma.cmsFaq.update({ where: { id }, data: { deletedAt: null } })
  },

  // ---- Testimonials -----------------------------------------------------
  async listTestimonials(includeDeleted = false) {
    await ensureTestimonialsSeeded()
    return prisma.cmsTestimonial.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { order: 'asc' },
    })
  },
  createTestimonial(body: {
    name: string
    country?: string
    quote: string
    rating?: number
    platform?: string
    photoUrl?: string
    order?: number
  }) {
    return prisma.cmsTestimonial.create({ data: body })
  },
  async updateTestimonial(
    id: string,
    body: Partial<{
      name: string
      country: string | null
      quote: string
      rating: number
      platform: string | null
      photoUrl: string | null
      enabled: boolean
      order: number
    }>,
  ) {
    const existing = await prisma.cmsTestimonial.findUnique({ where: { id } })
    if (!existing) throw notFound('Testimonial not found.')
    return prisma.cmsTestimonial.update({ where: { id }, data: body })
  },
  async softDeleteTestimonial(id: string) {
    const existing = await prisma.cmsTestimonial.findUnique({ where: { id } })
    if (!existing) throw notFound('Testimonial not found.')
    return prisma.cmsTestimonial.update({ where: { id }, data: { deletedAt: new Date() } })
  },
  async restoreTestimonial(id: string) {
    const existing = await prisma.cmsTestimonial.findUnique({ where: { id } })
    if (!existing) throw notFound('Testimonial not found.')
    return prisma.cmsTestimonial.update({ where: { id }, data: { deletedAt: null } })
  },

  // ---- Announcements ------------------------------------------------------
  listAnnouncements(includeDeleted = false) {
    return prisma.announcement.findMany({
      where: includeDeleted ? {} : { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  },
  createAnnouncement(
    actorId: string,
    body: {
      type?: 'MAINTENANCE' | 'PROMOTION' | 'NEWS' | 'RETURN' | 'POPUP' | 'TOP_BANNER' | 'DASHBOARD_BANNER'
      title: string
      body: string
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
      displayPage?: 'ALL' | 'HOME' | 'DASHBOARD' | 'WALLET'
      color?: string
      sticky?: boolean
      popup?: boolean
      scheduledAt?: string | null
      expiresAt?: string | null
      status?: CmsStatus
    },
  ) {
    return prisma.announcement.create({
      data: {
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        createdById: actorId,
        publishedAt: body.status === 'PUBLISHED' ? new Date() : null,
      },
    })
  },
  async updateAnnouncement(
    id: string,
    body: Partial<{
      type: 'MAINTENANCE' | 'PROMOTION' | 'NEWS' | 'RETURN' | 'POPUP' | 'TOP_BANNER' | 'DASHBOARD_BANNER'
      title: string
      body: string
      priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
      displayPage: 'ALL' | 'HOME' | 'DASHBOARD' | 'WALLET'
      color: string | null
      sticky: boolean
      popup: boolean
      scheduledAt: string | null
      expiresAt: string | null
      status: CmsStatus
    }>,
  ) {
    const existing = await prisma.announcement.findUnique({ where: { id } })
    if (!existing) throw notFound('Announcement not found.')
    return prisma.announcement.update({
      where: { id },
      data: {
        ...body,
        ...(body.scheduledAt !== undefined ? { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null } : {}),
        ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null } : {}),
        ...(body.status === 'PUBLISHED' && existing.status !== 'PUBLISHED' ? { publishedAt: new Date() } : {}),
      },
    })
  },
  async softDeleteAnnouncement(id: string) {
    const existing = await prisma.announcement.findUnique({ where: { id } })
    if (!existing) throw notFound('Announcement not found.')
    return prisma.announcement.update({ where: { id }, data: { deletedAt: new Date() } })
  },
  async restoreAnnouncement(id: string) {
    const existing = await prisma.announcement.findUnique({ where: { id } })
    if (!existing) throw notFound('Announcement not found.')
    return prisma.announcement.update({ where: { id }, data: { deletedAt: null } })
  },
  listActiveAnnouncements() {
    const now = new Date()
    return prisma.announcement.findMany({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    })
  },

  // ---- Pages --------------------------------------------------------------
  listPages() {
    return prisma.cmsPage.findMany({ orderBy: { slug: 'asc' } })
  },
  async getPage(slug: string) {
    const page = await prisma.cmsPage.findUnique({ where: { slug } })
    if (!page) throw notFound('Page not found.')
    return page
  },
  async upsertPage(slug: string, body: { title: string; body: string; status?: CmsStatus }) {
    return prisma.cmsPage.upsert({
      where: { slug },
      create: { slug, title: body.title, body: body.body, status: body.status ?? 'DRAFT' },
      update: {
        title: body.title,
        body: body.body,
        ...(body.status ? { status: body.status, publishedAt: body.status === 'PUBLISHED' ? new Date() : undefined } : {}),
      },
    })
  },
}
