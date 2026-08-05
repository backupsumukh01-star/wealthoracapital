/**
 * Map production CMS bootstrap into Admin OS in-memory shape (no localStorage).
 */
import type { LandingCms, AdminOsState } from '@/lib/admin-os-store'
import type { PlatformCms } from '@/lib/admin-cms-extras'
import type { CmsPublicBootstrap, PlatformCmsDocument } from '@/types/domain'
import { adminOsNow } from '@/lib/admin-os-store'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function str(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

export function mapPlatformCms(doc: PlatformCmsDocument, fallback: PlatformCms): PlatformCms {
  return {
    ...fallback,
    ...doc,
    dashboard: { ...fallback.dashboard, ...doc.dashboard },
    wallet: { ...fallback.wallet, ...doc.wallet },
    trades: { ...fallback.trades, ...doc.trades },
    performance: { ...fallback.performance, ...doc.performance },
    supportBlock: { ...fallback.supportBlock, ...doc.supportBlock },
    marketingNav: doc.marketingNav?.length ? doc.marketingNav : fallback.marketingNav,
  }
}

export function mapLandingCms(raw: unknown, fallback: LandingCms): LandingCms {
  const r = asRecord(raw)
  const motion = asRecord(r.heroMotion)
  return {
    ...fallback,
    logoUrl: str(r.logoUrl, fallback.logoUrl),
    companyName: str(r.companyName, fallback.companyName),
    heroTitle: str(r.heroTitle, fallback.heroTitle),
    heroSubtitle: str(r.heroSubtitle, fallback.heroSubtitle),
    heroPrimaryCta: str(r.heroPrimaryCta, fallback.heroPrimaryCta),
    heroSecondaryCta: str(r.heroSecondaryCta, fallback.heroSecondaryCta),
    heroBannerUrl: str(r.heroBannerUrl, fallback.heroBannerUrl),
    avgMonthlyReturn: str(r.avgMonthlyReturn, fallback.avgMonthlyReturn),
    winRate: str(r.winRate, fallback.winRate),
    aum: str(r.aum, fallback.aum),
    bestDay: str(r.bestDay, fallback.bestDay),
    investorCount: str(r.investorCount, fallback.investorCount),
    countries: str(r.countries, fallback.countries),
    riskDisclosure: str(r.riskDisclosure, fallback.riskDisclosure),
    footerTagline: str(r.footerTagline ?? r.footerBlurb, fallback.footerTagline),
    supportEmail: str(r.supportEmail, fallback.supportEmail),
    whatsapp: str(r.whatsapp, fallback.whatsapp),
    telegram: str(r.telegram, fallback.telegram),
    announcementsBanner: str(r.announcementsBanner, fallback.announcementsBanner),
    heroMotion: {
      particlesEnabled:
        typeof motion.particlesEnabled === 'boolean'
          ? motion.particlesEnabled
          : fallback.heroMotion.particlesEnabled,
      glowEnabled:
        typeof motion.glowEnabled === 'boolean'
          ? motion.glowEnabled
          : fallback.heroMotion.glowEnabled,
      intensity:
        typeof motion.intensity === 'number' ? motion.intensity : fallback.heroMotion.intensity,
    },
    status: 'PUBLISHED',
    updatedAt: str(r.updatedAt, adminOsNow()),
  }
}

export function applyCmsBootstrap(prev: AdminOsState, boot: CmsPublicBootstrap): AdminOsState {
  const landing = mapLandingCms(boot.landing, prev.landing)
  const platform = mapPlatformCms(boot.platform, prev.platformCms)
  const faqs = boot.faqs?.length
    ? boot.faqs.map((f, i) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
        order: i,
      }))
    : prev.faqs
  const testimonials = Array.isArray(boot.testimonials)
    ? (boot.testimonials
        .map((t, i) => {
          const row = asRecord(t)
          if (!str(row.quote ?? row.body, '')) return null
          return {
            id: str(row.id, `t-${i}`),
            name: str(row.name, 'Investor'),
            country: str(row.country, '—'),
            quote: str(row.quote ?? row.body, ''),
            rating: typeof row.rating === 'number' ? row.rating : 5,
            platform: str(row.platform ?? row.role ?? row.title, 'Growzy'),
            enabled: row.enabled !== false,
            photoUrl: str(row.photoUrl, ''),
            publishedAt: str(row.publishedAt, adminOsNow()),
          }
        })
        .filter(Boolean) as AdminOsState['testimonials'])
    : prev.testimonials

  const flags = boot.featureFlags ?? {}
  const seo = asRecord(boot.siteSeo)

  return {
    ...prev,
    landing,
    landingDraft: { ...landing, status: 'DRAFT' },
    platformCms: platform,
    platformCmsDraft: { ...platform, status: 'DRAFT' },
    faqs: faqs as AdminOsState['faqs'],
    testimonials,
    siteSeo: {
      ...prev.siteSeo,
      websiteName: str(seo.websiteName, prev.siteSeo.websiteName),
      logoUrl: str(seo.logoUrl, prev.siteSeo.logoUrl),
      faviconUrl: str(seo.faviconUrl, prev.siteSeo.faviconUrl),
      metaTitle: str(seo.metaTitle, prev.siteSeo.metaTitle),
      metaDescription: str(seo.metaDescription, prev.siteSeo.metaDescription),
      googleAnalyticsId: str(seo.googleAnalyticsId, prev.siteSeo.googleAnalyticsId),
      facebookPixelId: str(seo.facebookPixelId, prev.siteSeo.facebookPixelId),
      maintenanceMode:
        typeof seo.maintenanceMode === 'boolean'
          ? seo.maintenanceMode
          : prev.siteSeo.maintenanceMode,
      maintenanceMessage: str(seo.maintenanceMessage, prev.siteSeo.maintenanceMessage),
      supportHours: str(seo.supportHours, prev.siteSeo.supportHours),
      supportPhone: str(seo.supportPhone, prev.siteSeo.supportPhone),
      supportEmail: str(seo.supportEmail, prev.siteSeo.supportEmail),
      companyAddress: str(seo.companyAddress, prev.siteSeo.companyAddress),
      defaultLanguage: str(seo.defaultLanguage, prev.siteSeo.defaultLanguage),
    },
    toggles: {
      ...prev.toggles,
      registration: flags.registration ?? prev.toggles.registration,
      login: flags.login ?? prev.toggles.login,
      deposit: flags.deposit ?? prev.toggles.deposit,
      withdrawal: flags.withdrawal ?? prev.toggles.withdrawal,
      returns: flags.returns ?? prev.toggles.returns,
      referral: flags.referral ?? prev.toggles.referral,
      support: flags.support ?? prev.toggles.support,
      trading: flags.trading ?? prev.toggles.trading,
      maintenance: flags.maintenance ?? prev.toggles.maintenance,
      kyc: flags.kyc ?? prev.toggles.kyc,
      reports: flags.reports ?? prev.toggles.reports,
      notifications: flags.notifications ?? prev.toggles.notifications,
    },
    // Never hydrate fake trades/money from browser — trades come from trade APIs.
    trades: [],
    walletLedger: [],
  }
}
