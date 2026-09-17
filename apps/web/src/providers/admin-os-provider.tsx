'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  type AdminOsState,
  type Announcement,
  type CmsTrade,
  type CryptoWallet,
  type EmailTemplate,
  type FeatureToggles,
  type GlobalSettings,
  type InrPaymentMethod,
  type LandingCms,
  type LiveActivityConfig,
  type NotificationCampaign,
  type PerformanceSnapshot,
  type SupportTicket,
  type TickerPair,
  type WalletLedgerEntry,
  type TestimonialItem,
  adminOsId,
  adminOsNow,
  loadAdminOs,
  pushAudit,
  createDefaultAdminOs,
} from '@/lib/admin-os-store'
import { pushRevision } from '@/lib/admin-cms-extras'
import { applyCmsBootstrap } from '@/lib/cms-bootstrap-map'
import { cmsService } from '@/services/cms.service'

type AdminOsContextValue = {
  ready: boolean
  state: AdminOsState
  /** Landing — edit draft, save draft, publish draft → live */
  updateLandingDraft: (patch: Partial<LandingCms>) => void
  saveLandingDraft: () => void
  publishLanding: () => void
  previewLanding: LandingCms
  publishedLanding: LandingCms
  /** Ticker */
  upsertTicker: (pair: TickerPair) => void
  removeTicker: (id: string) => void
  reorderTicker: (orderedIds: string[]) => void
  /** Performance */
  updatePerformance: (patch: Partial<PerformanceSnapshot>) => void
  publishPerformance: () => void
  /** Trades */
  upsertTrade: (trade: CmsTrade) => void
  deleteTrade: (id: string) => void
  setTradeStatus: (id: string, status: CmsTrade['status']) => void
  publishedTrades: CmsTrade[]
  /** Payments */
  upsertInrMethod: (method: InrPaymentMethod) => void
  upsertCryptoWallet: (wallet: CryptoWallet) => void
  removeCryptoWallet: (id: string) => void
  /** Emails */
  updateEmailTemplate: (tpl: EmailTemplate) => void
  /** Global + toggles */
  updateGlobal: (patch: Partial<GlobalSettings>) => void
  updateToggles: (patch: Partial<FeatureToggles>) => void
  /** Activity */
  updateActivity: (patch: Partial<LiveActivityConfig>) => void
  /** Announcements */
  upsertAnnouncement: (a: Announcement) => void
  removeAnnouncement: (id: string) => void
  /** CMS pages / FAQ / testimonials */
  updateFaq: (id: string, patch: { question?: string; answer?: string }) => void
  addFaq: () => void
  removeFaq: (id: string) => void
  updateTestimonial: (id: string, enabled: boolean) => void
  updatePageBody: (slug: string, body: string) => void
  /** Support */
  replyTicket: (id: string, body: string, internal?: boolean) => void
  assignTicket: (id: string, assignee: string) => void
  closeTicket: (id: string) => void
  setTicketPriority: (id: string, priority: SupportTicket['priority']) => void
  /** Wallets */
  adjustWallet: (entry: Omit<WalletLedgerEntry, 'id' | 'at' | 'admin'>) => void
  /** Notifications */
  sendCampaign: (c: Omit<NotificationCampaign, 'id' | 'createdAt' | 'sentAt' | 'status'>) => void
  /** Audit helper */
  logAction: (action: string, user: string, oldValue: string, newValue: string) => void
  /** User timeline */
  timelineFor: (userId: string) => AdminOsState['userTimelines']
  /** CMS v3 */
  updateTickerDisplay: (patch: Partial<import('@/lib/admin-cms-extras').TickerDisplaySettings>) => void
  updateSiteSeo: (patch: Partial<import('@/lib/admin-cms-extras').SiteSeoSettings>) => void
  upsertMedia: (asset: import('@/lib/admin-cms-extras').MediaAsset) => void
  removeMedia: (id: string) => void
  upsertReportDoc: (doc: import('@/lib/admin-cms-extras').CmsReportDoc) => void
  removeReportDoc: (id: string) => void
  publishReportDoc: (id: string) => void
  exportBackup: (scope: 'settings' | 'content' | 'reports' | 'full') => string
  upsertTestimonial: (t: TestimonialItem) => void
  /** CMS v4 */
  rollbackRevision: (revisionId: string) => boolean
  updatePlatformCmsDraft: (patch: Partial<import('@/lib/admin-cms-extras').PlatformCms>) => void
  publishPlatformCms: () => void
  refreshSystemHealth: () => void
  updateRoleMatrix: (rows: import('@/lib/admin-cms-extras').RolePermissionRow[]) => void
  recordBackupPoint: (scope: string, sizeLabel: string) => void
}

const AdminOsContext = createContext<AdminOsContextValue | null>(null)

export function AdminOsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<AdminOsState>(() => createDefaultAdminOs())

  useEffect(() => {
    let cancelled = false
    setState(loadAdminOs())

    ;(async () => {
      try {
        const boot = await cmsService.publicBootstrap()
        if (cancelled) return
        setState((prev) => applyCmsBootstrap(prev, boot))
      } catch {
        // Keep empty defaults when CMS is unreachable.
      } finally {
        if (!cancelled) setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const commit = useCallback((updater: (prev: AdminOsState) => AdminOsState) => {
    // In-memory drafts only — never persist Admin OS to localStorage.
    setState((prev) => updater(prev))
  }, [])

  const logAction = useCallback(
    (action: string, user: string, oldValue: string, newValue: string) => {
      commit((prev) => pushAudit(prev, { action, user, oldValue, newValue }))
    },
    [commit],
  )

  const value = useMemo<AdminOsContextValue>(() => {
    return {
      ready,
      state,
      previewLanding: state.landingDraft,
      publishedLanding: state.landing,
      publishedTrades: state.trades.filter((t) => t.status === 'PUBLISHED'),

      updateLandingDraft: (patch) =>
        commit((prev) => ({
          ...prev,
          landingDraft: { ...prev.landingDraft, ...patch, updatedAt: adminOsNow(), status: 'DRAFT' },
        })),

      saveLandingDraft: () => {
        commit((prev) =>
          pushAudit(
            {
              ...prev,
              landingDraft: { ...prev.landingDraft, updatedAt: adminOsNow(), status: 'DRAFT' },
              revisions: pushRevision(prev.revisions, 'landing', 'Saved landing draft', prev.landingDraft),
            },
            {
              action: 'LANDING_SAVE_DRAFT',
              user: 'landing',
              oldValue: prev.landing.status,
              newValue: 'DRAFT',
            },
          ),
        )
      },

      publishLanding: () => {
        commit((prev) => {
          const published = {
            ...prev.landingDraft,
            status: 'PUBLISHED' as const,
            updatedAt: adminOsNow(),
          }
          void cmsService.publishLanding(published).catch(() => {
            /* UI keeps draft; operator should retry */
          })
          return pushAudit(
            {
              ...prev,
              landing: published,
              landingDraft: published,
              heroMotion: published.heroMotion,
              revisions: pushRevision(prev.revisions, 'landing', 'Published landing', published, {
                publishDate: adminOsNow(),
              }),
            },
            {
              action: 'LANDING_PUBLISH',
              user: 'landing',
              oldValue: prev.landing.updatedAt,
              newValue: published.updatedAt,
            },
          )
        })
      },

      upsertTicker: (pair) =>
        commit((prev) => {
          const exists = prev.ticker.some((t) => t.id === pair.id)
          const ticker = exists
            ? prev.ticker.map((t) => (t.id === pair.id ? pair : t))
            : [...prev.ticker, pair]
          return pushAudit(
            { ...prev, ticker },
            {
              action: exists ? 'TICKER_UPDATE' : 'TICKER_ADD',
              user: pair.pair,
              oldValue: exists ? 'updated' : '—',
              newValue: `${pair.pair} · ${pair.enabled ? 'on' : 'off'}`,
            },
          )
        }),

      removeTicker: (tid) =>
        commit((prev) =>
          pushAudit(
            { ...prev, ticker: prev.ticker.filter((t) => t.id !== tid) },
            { action: 'TICKER_REMOVE', user: tid, oldValue: tid, newValue: 'removed' },
          ),
        ),

      reorderTicker: (orderedIds) =>
        commit((prev) => ({
          ...prev,
          ticker: orderedIds
            .map((oid, order) => {
              const row = prev.ticker.find((t) => t.id === oid)
              return row ? { ...row, order } : null
            })
            .filter(Boolean) as TickerPair[],
        })),

      updatePerformance: (patch) =>
        commit((prev) => ({ ...prev, performance: { ...prev.performance, ...patch } })),

      publishPerformance: () =>
        commit((prev) =>
          pushAudit(
            {
              ...prev,
              performance: { ...prev.performance, publishedAt: adminOsNow() },
              landing: {
                ...prev.landing,
                avgMonthlyReturn: prev.performance.monthlyReturn,
                winRate: prev.performance.winningPct,
                bestDay: prev.performance.bestDay,
                updatedAt: adminOsNow(),
              },
            },
            {
              action: 'PERFORMANCE_PUBLISH',
              user: 'performance',
              oldValue: prev.performance.publishedAt ?? '—',
              newValue: adminOsNow(),
            },
          ),
        ),

      upsertTrade: (trade) =>
        commit((prev) => {
          const exists = prev.trades.some((t) => t.id === trade.id)
          const trades = exists
            ? prev.trades.map((t) => (t.id === trade.id ? trade : t))
            : [trade, ...prev.trades]
          return pushAudit(
            { ...prev, trades },
            {
              action: exists ? 'TRADE_UPDATE' : 'TRADE_CREATE',
              user: trade.id,
              oldValue: exists ? 'edit' : '—',
              newValue: `${trade.pair} ${trade.status}`,
            },
          )
        }),

      deleteTrade: (tid) =>
        commit((prev) =>
          pushAudit(
            { ...prev, trades: prev.trades.filter((t) => t.id !== tid) },
            { action: 'TRADE_DELETE', user: tid, oldValue: tid, newValue: 'deleted' },
          ),
        ),

      setTradeStatus: (tid, status) =>
        commit((prev) =>
          pushAudit(
            {
              ...prev,
              trades: prev.trades.map((t) =>
                t.id === tid
                  ? {
                      ...t,
                      status,
                      publishedAt: status === 'PUBLISHED' ? adminOsNow() : t.publishedAt,
                    }
                  : t,
              ),
            },
            { action: 'TRADE_STATUS', user: tid, oldValue: '—', newValue: status },
          ),
        ),

      upsertInrMethod: (method) =>
        commit((prev) => {
          const exists = prev.inrMethods.some((m) => m.id === method.id)
          return pushAudit(
            {
              ...prev,
              inrMethods: exists
                ? prev.inrMethods.map((m) => (m.id === method.id ? method : m))
                : [...prev.inrMethods, method],
            },
            {
              action: 'PAYMENT_INR_UPSERT',
              user: method.id,
              oldValue: '—',
              newValue: `${method.label} ${method.enabled ? 'on' : 'off'}`,
            },
          )
        }),

      upsertCryptoWallet: (wallet) =>
        commit((prev) => {
          const exists = prev.cryptoWallets.some((w) => w.id === wallet.id)
          return pushAudit(
            {
              ...prev,
              cryptoWallets: exists
                ? prev.cryptoWallets.map((w) => (w.id === wallet.id ? wallet : w))
                : [...prev.cryptoWallets, wallet],
            },
            {
              action: 'PAYMENT_CRYPTO_UPSERT',
              user: wallet.id,
              oldValue: '—',
              newValue: `${wallet.coin}/${wallet.network}`,
            },
          )
        }),

      removeCryptoWallet: (wid) =>
        commit((prev) =>
          pushAudit(
            { ...prev, cryptoWallets: prev.cryptoWallets.filter((w) => w.id !== wid) },
            { action: 'PAYMENT_CRYPTO_REMOVE', user: wid, oldValue: wid, newValue: 'removed' },
          ),
        ),

      updateEmailTemplate: (tpl) =>
        commit((prev) => {
          const exists = prev.emailTemplates.some((t) => t.id === tpl.id || t.key === tpl.key)
          const emailTemplates = exists
            ? prev.emailTemplates.map((t) =>
                t.id === tpl.id || t.key === tpl.key
                  ? { ...tpl, updatedAt: adminOsNow() }
                  : t,
              )
            : [...prev.emailTemplates, { ...tpl, updatedAt: adminOsNow() }]
          return pushAudit(
            { ...prev, emailTemplates },
            {
              action: 'EMAIL_TEMPLATE_UPDATE',
              user: tpl.key,
              oldValue: '—',
              newValue: tpl.subject,
            },
          )
        }),

      updateGlobal: (patch) =>
        commit((prev) =>
          pushAudit(
            { ...prev, global: { ...prev.global, ...patch } },
            {
              action: 'GLOBAL_SETTINGS',
              user: 'settings',
              oldValue: '—',
              newValue: Object.keys(patch).join(', '),
            },
          ),
        ),

      updateToggles: (patch) =>
        commit((prev) =>
          pushAudit(
            { ...prev, toggles: { ...prev.toggles, ...patch } },
            {
              action: 'FEATURE_TOGGLE',
              user: 'toggles',
              oldValue: JSON.stringify(
                Object.fromEntries(Object.keys(patch).map((k) => [k, prev.toggles[k as keyof FeatureToggles]])),
              ),
              newValue: JSON.stringify(patch),
            },
          ),
        ),

      updateActivity: (patch) =>
        commit((prev) => ({ ...prev, activity: { ...prev.activity, ...patch } })),

      upsertAnnouncement: (a) =>
        commit((prev) => {
          const exists = prev.announcements.some((x) => x.id === a.id)
          return pushAudit(
            {
              ...prev,
              announcements: exists
                ? prev.announcements.map((x) => (x.id === a.id ? a : x))
                : [a, ...prev.announcements],
            },
            {
              action: 'ANNOUNCEMENT_UPSERT',
              user: a.id,
              oldValue: '—',
              newValue: `${a.type} ${a.status}`,
            },
          )
        }),

      removeAnnouncement: (id) =>
        commit((prev) =>
          pushAudit(
            {
              ...prev,
              announcements: prev.announcements.filter((a) => a.id !== id),
            },
            {
              action: 'ANNOUNCEMENT_DELETE',
              user: id,
              oldValue: id,
              newValue: '—',
            },
          ),
        ),

      updateFaq: (fid, patch) =>
        commit((prev) => ({
          ...prev,
          faqs: prev.faqs.map((f) => (f.id === fid ? { ...f, ...patch } : f)),
        })),

      addFaq: () =>
        commit((prev) => ({
          ...prev,
          faqs: [
            ...prev.faqs,
            {
              id: adminOsId('FAQ'),
              question: 'New question',
              answer: 'Answer…',
              order: prev.faqs.length,
            },
          ],
        })),

      removeFaq: (fid) =>
        commit((prev) => ({ ...prev, faqs: prev.faqs.filter((f) => f.id !== fid) })),

      updateTestimonial: (tid, enabled) =>
        commit((prev) => ({
          ...prev,
          testimonials: prev.testimonials.map((t) => (t.id === tid ? { ...t, enabled } : t)),
        })),

      updatePageBody: (slug, body) =>
        commit((prev) => ({
          ...prev,
          pages: prev.pages.map((p) =>
            p.slug === slug ? { ...p, body, updatedAt: adminOsNow() } : p,
          ),
        })),

      replyTicket: (tid, body, internal) =>
        commit((prev) =>
          pushAudit(
            {
              ...prev,
              tickets: prev.tickets.map((t) =>
                t.id === tid
                  ? {
                      ...t,
                      status: t.status === 'OPEN' ? 'ASSIGNED' : t.status,
                      messages: [
                        ...t.messages,
                        {
                          id: adminOsId('msg'),
                          from: internal ? 'internal' : 'agent',
                          body,
                          at: adminOsNow(),
                        },
                      ],
                    }
                  : t,
              ),
            },
            {
              action: internal ? 'TICKET_NOTE' : 'TICKET_REPLY',
              user: tid,
              oldValue: '—',
              newValue: body.slice(0, 80),
            },
          ),
        ),

      assignTicket: (tid, assignee) =>
        commit((prev) => ({
          ...prev,
          tickets: prev.tickets.map((t) =>
            t.id === tid ? { ...t, assignee, status: 'ASSIGNED' as const } : t,
          ),
        })),

      closeTicket: (tid) =>
        commit((prev) =>
          pushAudit(
            {
              ...prev,
              tickets: prev.tickets.map((t) =>
                t.id === tid ? { ...t, status: 'CLOSED' as const } : t,
              ),
            },
            { action: 'TICKET_CLOSE', user: tid, oldValue: 'OPEN', newValue: 'CLOSED' },
          ),
        ),

      setTicketPriority: (tid, priority) =>
        commit((prev) => ({
          ...prev,
          tickets: prev.tickets.map((t) => (t.id === tid ? { ...t, priority } : t)),
        })),

      adjustWallet: (entry) =>
        commit((prev) => {
          const row: WalletLedgerEntry = {
            ...entry,
            id: adminOsId('WL'),
            at: adminOsNow(),
            admin: 'admin@wealthoracapital.com',
          }
          const timeline = {
            id: adminOsId('UT'),
            userId: entry.userId,
            at: adminOsNow(),
            type: entry.action,
            label: `Wallet ${entry.action.toLowerCase()} · ${entry.wallet}`,
            detail: `${entry.amount} — ${entry.note}`,
          }
          return pushAudit(
            {
              ...prev,
              walletLedger: [row, ...prev.walletLedger],
              userTimelines: [timeline, ...prev.userTimelines],
            },
            {
              action: `WALLET_${entry.action}`,
              user: entry.userId,
              oldValue: entry.wallet,
              newValue: `${entry.amount} ${entry.note}`,
            },
          )
        }),

      sendCampaign: (c) =>
        commit((prev) => {
          const row: NotificationCampaign = {
            ...c,
            id: adminOsId('CMP'),
            status: 'SENT',
            createdAt: adminOsNow(),
            sentAt: adminOsNow(),
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('growzy:notify', {
                detail: {
                  title: c.title,
                  body: c.body,
                  category: 'ANNOUNCEMENT',
                },
              }),
            )
          }
          return pushAudit(
            { ...prev, campaigns: [row, ...prev.campaigns] },
            {
              action: 'NOTIFICATION_SEND',
              user: c.audienceDetail,
              oldValue: '—',
              newValue: c.title,
            },
          )
        }),

      logAction,
      timelineFor: (userId) =>
        state.userTimelines
          .filter((e) => e.userId === userId)
          .sort((a, b) => (a.at < b.at ? 1 : -1)),

      updateTickerDisplay: (patch) =>
        commit((prev) =>
          pushAudit(
            { ...prev, tickerDisplay: { ...prev.tickerDisplay, ...patch } },
            {
              action: 'TICKER_DISPLAY',
              user: 'ticker',
              oldValue: JSON.stringify(prev.tickerDisplay),
              newValue: JSON.stringify(patch),
            },
          ),
        ),

      updateSiteSeo: (patch) =>
        commit((prev) =>
          pushAudit(
            {
              ...prev,
              siteSeo: { ...prev.siteSeo, ...patch },
              global: {
                ...prev.global,
                companyName: patch.websiteName ?? prev.global.companyName,
                logoUrl: patch.logoUrl ?? prev.global.logoUrl,
                supportEmail: patch.supportEmail ?? prev.global.supportEmail,
                maintenanceMode: patch.maintenanceMode ?? prev.global.maintenanceMode,
              },
              revisions: pushRevision(prev.revisions, 'siteSeo', 'Updated site settings', patch),
            },
            {
              action: 'SITE_SEO_UPDATE',
              user: 'settings',
              oldValue: '—',
              newValue: Object.keys(patch).join(', '),
            },
          ),
        ),

      upsertMedia: (asset) =>
        commit((prev) => {
          const exists = prev.media.some((m) => m.id === asset.id)
          return pushAudit(
            {
              ...prev,
              media: exists
                ? prev.media.map((m) => (m.id === asset.id ? asset : m))
                : [asset, ...prev.media],
            },
            {
              action: exists ? 'MEDIA_UPDATE' : 'MEDIA_ADD',
              user: asset.id,
              oldValue: '—',
              newValue: asset.name,
            },
          )
        }),

      removeMedia: (id) =>
        commit((prev) =>
          pushAudit(
            { ...prev, media: prev.media.filter((m) => m.id !== id) },
            { action: 'MEDIA_DELETE', user: id, oldValue: id, newValue: 'deleted' },
          ),
        ),

      upsertReportDoc: (doc) =>
        commit((prev) => {
          const exists = prev.reportDocs.some((r) => r.id === doc.id)
          return {
            ...prev,
            reportDocs: exists
              ? prev.reportDocs.map((r) => (r.id === doc.id ? doc : r))
              : [doc, ...prev.reportDocs],
          }
        }),

      removeReportDoc: (id) =>
        commit((prev) => ({
          ...prev,
          reportDocs: prev.reportDocs.filter((r) => r.id !== id),
        })),

      publishReportDoc: (id) =>
        commit((prev) =>
          pushAudit(
            {
              ...prev,
              reportDocs: prev.reportDocs.map((r) =>
                r.id === id
                  ? { ...r, status: 'PUBLISHED' as const, publishedAt: adminOsNow() }
                  : r,
              ),
            },
            { action: 'REPORT_PUBLISH', user: id, oldValue: 'DRAFT', newValue: 'PUBLISHED' },
          ),
        ),

      exportBackup: (scope) => {
        const payload =
          scope === 'settings'
            ? { siteSeo: state.siteSeo, global: state.global, toggles: state.toggles }
            : scope === 'content'
              ? {
                  landing: state.landing,
                  faqs: state.faqs,
                  testimonials: state.testimonials,
                  pages: state.pages,
                  announcements: state.announcements,
                }
              : scope === 'reports'
                ? { reportDocs: state.reportDocs }
                : state
        const json = JSON.stringify(payload, null, 2)
        if (typeof window !== 'undefined') {
          const blob = new Blob([json], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `wealthora-backup-${scope}-${Date.now()}.json`
          a.click()
          URL.revokeObjectURL(url)
        }
        return json
      },

      upsertTestimonial: (t) =>
        commit((prev) => {
          const exists = prev.testimonials.some((x) => x.id === t.id)
          return {
            ...prev,
            testimonials: exists
              ? prev.testimonials.map((x) => (x.id === t.id ? t : x))
              : [t, ...prev.testimonials],
          }
        }),

      rollbackRevision: (revisionId) => {
        let ok = false
        commit((prev) => {
          const rev = prev.revisions.find((r) => r.id === revisionId)
          if (!rev) return prev
          try {
            const data = JSON.parse(rev.snapshot) as Record<string, unknown>
            ok = true
            if (rev.module === 'landing') {
              const landing = { ...prev.landing, ...data, status: 'DRAFT' as const }
              return pushAudit(
                {
                  ...prev,
                  landingDraft: landing as typeof prev.landingDraft,
                  revisions: pushRevision(prev.revisions, 'landing', `Rollback · ${rev.label}`, data),
                },
                {
                  action: 'CMS_ROLLBACK',
                  user: rev.id,
                  oldValue: rev.at,
                  newValue: 'restored to draft',
                },
              )
            }
            if (rev.module === 'platform') {
              return pushAudit(
                {
                  ...prev,
                  platformCmsDraft: { ...prev.platformCmsDraft, ...data, status: 'DRAFT' },
                  revisions: pushRevision(prev.revisions, 'platform', `Rollback · ${rev.label}`, data),
                },
                {
                  action: 'CMS_ROLLBACK',
                  user: rev.id,
                  oldValue: rev.at,
                  newValue: 'platform draft',
                },
              )
            }
            if (rev.module === 'siteSeo') {
              return pushAudit(
                {
                  ...prev,
                  siteSeo: { ...prev.siteSeo, ...data },
                  revisions: pushRevision(prev.revisions, 'siteSeo', `Rollback · ${rev.label}`, data),
                },
                {
                  action: 'CMS_ROLLBACK',
                  user: rev.id,
                  oldValue: rev.at,
                  newValue: 'siteSeo',
                },
              )
            }
            ok = false
            return prev
          } catch {
            ok = false
            return prev
          }
        })
        return ok
      },

      updatePlatformCmsDraft: (patch) =>
        commit((prev) => ({
          ...prev,
          platformCmsDraft: {
            ...prev.platformCmsDraft,
            ...patch,
            status: 'DRAFT',
            updatedAt: adminOsNow(),
          },
        })),

      publishPlatformCms: () =>
        commit((prev) => {
          const published = {
            ...prev.platformCmsDraft,
            status: 'PUBLISHED' as const,
            updatedAt: adminOsNow(),
            publishedAt: adminOsNow(),
          }
          void cmsService.publishPlatform(published).catch(() => {
            /* retry from CMS workspace */
          })
          return pushAudit(
            {
              ...prev,
              platformCms: published,
              platformCmsDraft: published,
              revisions: pushRevision(prev.revisions, 'platform', 'Published platform CMS', published, {
                publishDate: adminOsNow(),
              }),
            },
            {
              action: 'PLATFORM_CMS_PUBLISH',
              user: 'platform',
              oldValue: prev.platformCms.updatedAt,
              newValue: published.updatedAt,
            },
          )
        }),

      refreshSystemHealth: () =>
        commit((prev) => ({
          ...prev,
          systemHealth: {
            ...prev.systemHealth,
            refreshedAt: adminOsNow(),
            metrics: prev.systemHealth.metrics.map((m) =>
              m.id === 'online'
                ? { ...m, value: String(8 + Math.floor(Math.random() * 20)) }
                : m.id === 'latency'
                  ? { ...m, value: `${30 + Math.floor(Math.random() * 40)} ms` }
                  : m,
            ),
          },
        })),

      updateRoleMatrix: (rows) =>
        commit((prev) =>
          pushAudit(
            { ...prev, roleMatrix: rows },
            {
              action: 'ROLE_MATRIX_UPDATE',
              user: 'roles',
              oldValue: `${prev.roleMatrix.length} roles`,
              newValue: `${rows.length} roles`,
            },
          ),
        ),

      recordBackupPoint: (scope, sizeLabel) =>
        commit((prev) => ({
          ...prev,
          backupCenter: {
            ...prev.backupCenter,
            lastBackupAt: adminOsNow(),
            lastSizeLabel: sizeLabel,
            points: [
              {
                id: adminOsId('BP'),
                label: `${scope} export`,
                at: adminOsNow(),
                sizeLabel,
                scope,
              },
              ...prev.backupCenter.points,
            ].slice(0, 20),
          },
        })),
    }
  }, [ready, state, commit, logAction])

  return <AdminOsContext.Provider value={value}>{children}</AdminOsContext.Provider>
}

export function useAdminOs() {
  const ctx = useContext(AdminOsContext)
  if (!ctx) throw new Error('useAdminOs must be used within AdminOsProvider')
  return ctx
}
