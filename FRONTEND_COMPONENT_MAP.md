# Growzy — Frontend Component Map

Maps every major UI component folder to the pages and flows that use it.  
**No code was modified for this document.**

---

## 1. Page → primary workspace

### Marketing

| Page | Primary components |
|------|-------------------|
| `/` | `Hero`, `PerformanceHighlights`, `PerformanceShowcase`, `HowItWorks`, `TodaysMarkets`, `TodaysTradingActivity`, `PerformanceProof`, `Testimonials`, `GlobalFootprintSection`, `HomeFaq`, `RiskBanner`, `CtaBand` + shell (`NavBar`, `ForexTicker`, `CmsSiteOverlays`, `Footer`, `LiveActivityToasts`) |
| `/how-it-works` | `PageHero`, `HowItWorks` / process sections, `CtaBand` |
| `/our-trading-system` | `trading-system/*` suite |
| `/performance` | Performance charts, timeline, calculator sections |
| `/transparency` | `PerformanceProof`, historical sections |
| `/security` | Security content sections |
| `/technology` | Technology / stack sections |
| `/investors` | `InvestorMap`, footprint |
| `/resources` | Hub cards, `CmsReportDownloads`, `FaqAccordion` |
| `/about` | `AboutContent`, optional CMS |
| `/faq` | `FaqAccordion` |
| `/contact` | `ContactForm` |
| `/legal/*` | `LegalDocument`, `CmsPageBody` (terms/privacy) |

### Auth

| Page | Primary components |
|------|-------------------|
| `/login` | `LoginForm`, `AuthLayout` |
| `/register` | `RegisterForm` |
| `/forgot-password` | `ForgotPasswordForm` |
| `/reset-password` | `ResetPasswordForm` |
| `/verify-email` | `VerifyEmailPanel`, `OtpInput` |
| `/verify-email/sent` | Success / inbox state |
| `/oauth/callback` | Callback handler → dashboard |
| `/onboarding` | `OnboardingWizard`, `KycUploadSlot` |
| Marketing modal | `AuthModal` (welcome / login / register) |

### Investor dashboard

| Page | Primary components |
|------|-------------------|
| `/dashboard` | `WealthHome`, `PortfolioHero`, `OverviewCards`, `LiveReturnBadge`, `RecentTrades`, `AccountStatusBanner` |
| `/my-performance` | `PerformanceWorkspace` |
| `/wallet` | `WalletCenter`, `DepositModal`, `WithdrawModal` |
| `/trades` | `TradeHistoryWorkspace` |
| `/trades/[id]` | `TradeDetailWorkspace` |
| `/transactions` | `TransactionsWorkspace`, `ActivityTimeline` |
| `/notifications` | `NotificationsWorkspace` |
| `/support` | `SupportWorkspace`, optional `SupportChatWidget` |
| `/referrals` | Referral widgets |
| `/settings/profile` | `ProfileWorkspace` |
| `/settings/security` | `SecuritySettingsPanel` |
| `/settings/payout-methods` | `PayoutMethodsPanel` |
| `/settings/preferences` | `PreferencesPanel` |
| `/settings/emails` | `EmailPreviewWorkspace` / `PremiumEmailPreview` |

**Shell:** `DashboardShell` → `Sidebar`, `Topbar`, `MobileNav`, `WalletFab`.

### Admin

| Page | Primary workspace |
|------|-------------------|
| `/admin` | `AdminOverviewWorkspace` |
| `/admin/deposits` | `AdminDepositsWorkspace` |
| `/admin/deposits/[id]` | `AdminDepositDetailWorkspace` |
| `/admin/withdrawals` | `AdminWithdrawalsWorkspace` |
| `/admin/withdrawals/[id]` | `AdminWithdrawalDetailWorkspace` |
| `/admin/users` | `AdminUsersWorkspace` |
| `/admin/users/[id]` | `AdminUserDetail` |
| `/admin/kyc` | `AdminKycQueue` |
| `/admin/kyc/[id]` | `AdminKycReviewWorkspace` |
| `/admin/wallets` | `AdminWalletManagerWorkspace` |
| `/admin/support` | `AdminSupportWorkspace` |
| `/admin/trades` | `AdminTradeOsWorkspace` |
| `/admin/trades/new` | `AdminTradeForm` |
| `/admin/trades/[id]` | `AdminTradeDetail` |
| `/admin/daily-return` | `AdminReturnsWorkspace` |
| `/admin/daily-return/[id]` | `AdminReturnRunDetail` |
| `/admin/performance` | `AdminPerformanceCmsWorkspace` |
| `/admin/ticker` | `AdminTickerWorkspace` |
| `/admin/reports` | `AdminReportsWorkspace` |
| `/admin/report-library` | `AdminReportLibraryWorkspace` |
| `/admin/cms/landing` | `AdminLandingCmsWorkspace` |
| `/admin/cms/content` | `AdminContentCmsWorkspace` |
| `/admin/cms/media` | `AdminMediaWorkspace` |
| `/admin/cms/site` | `AdminSiteSettingsWorkspace` |
| `/admin/cms/backup` | `AdminBackupWorkspace` |
| `/admin/activity` | `AdminActivityWorkspace` |
| `/admin/announcements` | `AdminAnnouncementsWorkspace` |
| `/admin/notifications` | `AdminNotificationsWorkspace` |
| `/admin/broadcast` | `AdminBroadcastWorkspace` |
| `/admin/emails` | `AdminEmailCenter` / outbox |
| `/admin/email-templates` | `AdminEmailTemplatesWorkspace` |
| `/admin/feature-toggles` | `AdminFeatureTogglesWorkspace` |
| `/admin/audit-log` | `AdminAuditWorkspace` |
| `/admin/settings/*` | `AdminSettingsWorkspace` / `AdminGlobalSettingsWorkspace` / `AdminPaymentsOsWorkspace` |
| `/admin/login` | `AdminLoginForm` |

**Shell:** Admin layout → `AdminSidebar`, `AdminTopbar`, session gate.

---

## 2. Component inventory by folder

### 2.1 `components/admin` (44)

Shared chrome: `admin-panel`, `admin-sidebar`, `admin-topbar`, `admin-settings-nav`, `admin-status-pills`, `animated-counter`, `confirm-action-dialog`.

Workspaces (one-line each): overview · deposits · deposit detail · withdrawals · withdrawal detail · users · user detail · KYC queue · KYC review · wallets · support · trades OS · trades list · trade form · trade detail · returns · return run · performance CMS · ticker · reports · report library · landing CMS · content CMS · media · site settings/backup · activity · announcements · notifications · broadcast · email center/outbox · email templates · feature toggles · audit · global settings · settings hub · payments OS · login form.

### 2.2 `components/marketing` (69)

Shell / chrome: `marketing-shell`, `nav-bar`, `mobile-nav`, `footer`, `premium-atmosphere`, `ambient-particles`, `page-hero`, `cta-band`, `risk-banner`.

CMS consumers: `cms-site-overlays`, `cms-seo-effects`, `cms-page-body`, `cms-report-downloads`, `forex-ticker`, `home-faq`, `testimonials`, `live-activity-toasts`, `hero` (motion + copy).

Landing sections: performance highlights/showcase/proof, monthly chart, historical timeline, how-it-works, today’s markets/activity, live trades preview, global footprint, investor map, FAQ accordion, contact form, about content, trust strips, calculators, trading-system/* deep-dive.

### 2.3 `components/dashboard` (61)

Shell: `dashboard-shell`, `sidebar`, `topbar`, `mobile-nav`, `wallet-fab`.

Home / wealth: `wealth-home`, `portfolio-hero`, `overview-cards`, `quick-actions`, `live-return-badge`, `growth-chart`, `account-status-banner`, `kyc-banner`.

Money / activity: wallet summary, transactions, activity timeline, deposit/withdraw legacy panels (redirected flows use wallet components).

Trading / performance: trade history/detail/cards, performance workspace/calendar/summary, live performance chart.

Account: profile, security, preferences, payout methods, notifications, support, referrals, email preview.

### 2.4 `components/wallet` (11)

`wallet-center`, `deposit-modal`, `withdraw-modal`, `wallet-modal-shell`, `proof-upload`, `qr-card`, `bank-card`, `wallet-card`, `upi-app-cards`, `success-modal`.

### 2.5 `components/auth` (25)

Layout/forms: `auth-layout`, `auth-card`, `login-form`, `register-form`, `forgot/reset`, `verify-email-panel`, `auth-modal`, `onboarding-wizard`, `kyc-upload-slot`, `otp-input`, `password-field`, `password-strength`, `social-login-buttons`, `protected-route`, success states, illustrations.

### 2.6 `components/common` (20)

`page-header`, `section`, `money`, `percent`, `stat-card`, `status-badge`, `data-table`, `filter-bar`, `confirm-dialog`, `notification-bell`, `user-menu`, `theme-toggle`, `logo`, `seo`, `risk-disclosure`, `premium-email-preview`, `error-boundary`, …

### 2.7 `components/ui` (34)

Radix-backed primitives: button, input, textarea, select, dialog, sheet, tabs, table, toast, tooltip, accordion, badge, avatar, checkbox, switch, pagination, skeleton, spinner, file-dropzone, form-field, …

### 2.8 `components/motion` (11)

`fade-in`, `reveal-on-scroll`, `stagger-group`, `marquee`, `count-up`, `magnetic`, `page-transition`, `motion-config`, …

---

## 3. Providers → consumers

| Provider | Typical consumers |
|----------|-------------------|
| `InvestorLifecycleProvider` | Auth forms, wallet modals, admin KYC/deposit/withdraw/returns, account banners |
| `AdminOsProvider` | All CMS workspaces + marketing CMS-aware sections + trade OS |
| `NotificationsProvider` | Bell, notifications page, lifecycle push events |
| `AuthModalProvider` | Marketing CTAs / nav auth |
| `SessionProvider` | Future `/auth/me` scaffold |
| `ThemeProvider` | Theme toggle |
| `QueryProvider` | Prepared for API queries |

---

## 4. CMS publish → frontend bindings

| Admin control | Frontend consumer |
|---------------|-------------------|
| Landing publish | `Hero`, footer, highlights stats, popup/banner text |
| Hero motion | `Hero` particles/glow intensity |
| Ticker + display | `ForexTicker` |
| Performance monthly/yearly | Charts, showcase, historical timeline |
| Published trades | `LiveTradesPreview`, trade history/detail |
| FAQs | `HomeFaq` |
| Testimonials | `Testimonials` |
| Activity config | `LiveActivityToasts` |
| Announcements | `CmsSiteOverlays` |
| Site SEO / maintenance | `CmsSeoEffects`, maintenance overlay |
| Report library publish | `CmsReportDownloads` on `/resources` |
| Pages body | `CmsPageBody` on terms/privacy |

---

## 5. Shared UI patterns

| Pattern | Location | Usage |
|---------|----------|-------|
| Glass panel | `AdminPanel`, marketing `card-fill` | Admin + marketing cards |
| Page header | `PageHeader` | Dashboard + admin titles |
| Confirm | `ConfirmActionDialog` | CMS publish / delete |
| Toast | Sonner via `ToastProvider` | Success/error feedback |
| Money / Percent | `common/money`, `common/percent` | Never raw floats in UI |
| Empty / skeleton | `PremiumEmptyState`, `Skeleton` | Loading & empty lists |

---

## 6. Demo credentials (UI copy)

| Role | Credentials |
|------|-------------|
| Investor | `investor@growzy.com` / `Growzy2026!` · OTP `123456` |
| Admin | `admin@growzy.com` / `GrowzyAdmin2026!` · OTP `123456` |

---

## 7. How to extend frontend safely

1. Add route to `packages/shared` `ROUTES` first  
2. Add page under correct route group  
3. Prefer a `*-workspace.tsx` for heavy pages  
4. Read/write domain state via providers — not ad-hoc localStorage  
5. For marketing content, extend Admin OS + wire a consumer (publish model)  
6. Keep money as strings at boundaries  

See also: `SYSTEM_ARCHITECTURE.md`, `PROJECT_STRUCTURE.md`, `BACKEND_REQUIREMENTS.md`.
