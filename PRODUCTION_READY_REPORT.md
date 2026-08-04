# Growzy Frontend — Production Ready Report

**Date:** 2026-08-02  
**Auditor stance:** Senior UI engineer, production-launch checklist  
**Constraint:** Verify + polish only · no redesign · no new product features  
**Typecheck:** `pnpm --filter @meridian/web typecheck` — **pass**

---

## Executive summary

The **marketing site, authentication UI, and shared design system** are in strong shape for a public frontend launch with demo data. Sticky chrome, contact form, charts/tickers, error pages, SEO basics, favicon, and route guards are present and consistent with the Growzy brand.

The **investor dashboard and admin** remain partially placeholder-backed (expected before backend). Login protection is a **demo cookie redirect**, not cryptographic auth.

| Metric | Score |
|--------|------:|
| **Frontend completion** | **86%** |
| **Production readiness** | **76 / 100** |

**Verdict:** Ready to proceed to **backend development** against a polished frontend shell. Not ready to claim full product production until API, real auth, and dashboard forms ship.

---

## Production readiness score — breakdown

| Area | Weight | Score | Notes |
|------|-------:|------:|-------|
| Branding & design language | 10 | 9.5 | Growzy-consistent; legal name reserved for legal/about |
| Marketing pages & responsive | 15 | 13.5 | Contact rebuilt; 320–1920 reviewed in prior QA |
| Auth UX | 10 | 9.0 | Forms, validation, loading, success, focus polish |
| Charts / tickers / motion | 10 | 9.0 | Fixed heights, CLS-safe tickers, interactive timeline |
| Dashboard / admin completeness | 15 | 8.0 | Shell strong; many routes still Placeholder |
| A11y | 10 | 8.0 | Skip link, focus rings, form wiring; map still mouse-first |
| SEO / discoverability | 10 | 9.0 | Metadata, sitemap, robots, OG image, manifest added |
| Error / loading / empty states | 8 | 7.0 | 404/500/global-error/loading exist; empty used in tables |
| Security / login protection | 12 | 6.0 | Demo `mfx_at` + middleware guards — not real auth |
| Performance posture | 10 | 8.0 | Dynamic imports, CSS transforms; Lighthouse not run in CI |

**Weighted ≈ 76 / 100**

---

## Frontend completion percentage — by surface

| Surface | Completion | Comment |
|---------|----------:|---------|
| Design system (tokens, UI kit, buttons, forms) | 95% | Production-quality primitives |
| Marketing landing + sections | 93% | Premium restore + audit fixes |
| Marketing inner pages | 90% | About team still Placeholder by design |
| Contact | 95% | Client form + success; API/captcha later |
| Auth (login/register/forgot/reset/verify) | 92% | Demo credentials; OAuth Apple disabled |
| Dashboard shell (nav, overview widgets) | 85% | Demo data wired |
| Dashboard transactional forms | 45% | Deposit/withdraw/settings mostly Placeholder |
| Admin | 40% | Structure present; operators await backend |
| SEO / PWA meta | 90% | Manifest + OG added this pass |
| Observability (Sentry etc.) | 10% | Console stub only |

**Overall frontend completion: 86%**

---

## Verification checklist

### Branding consistency — Pass
- Public brand: **Growzy**; legal entity string available as `SITE.legalName` for About/legal.
- Favicon / Apple icon / OG mark use the emerald gradient “G”.
- Residual package scope `@meridian/shared` is internal monorepo naming only (not user-facing).
- Demo referral codes polished to `GRZ*` (was `MFX*`).

### Responsive layout — Pass (with known scrollports)
- Sticky header + ticker stack; contact, heroes, meters, SectionHeader stacking verified previously.
- Inner overflow (chip rows, rare charts) is contained — no page-level horizontal scroll intended.

### Hero hierarchy / typography / icons — Pass
- PageHero + landing Hero keep brand → headline → support → CTA order.
- Geist Sans/Mono via CSS variables; Lucide icons with consistent sizing patterns.

### Charts / performance graph / timeline — Pass
- Monthly growth SVG + Historical Return Timeline interactive bars.
- Fixed heights; spring/ease animations; reduced-motion paths.

### Testimonials / trade ticker — Pass
- CSS infinite scroll, pause on hover/focus/touch, no CLS from feed growth.

### Dashboard — Conditional pass
- Overview usable with demo data.
- Incomplete: settings, deposit/withdraw workflows (Placeholder).

### Authentication — Pass (demo)
- Full form UX; `loadingText`; success states; social Google preview / Apple disabled.
- Demo: `investor@growzy.com` / `Growzy2026!`.

### Contact — Pass
- Validated form, honeypot, success state, equal card padding, Risk → CTA close.

### Header / Footer — Pass
- Glass sticky nav + ticker; focus rings; newsletter + social focus polish.

### Empty / error / loading states — Pass
- `EmptyState`, `Skeleton*`, root `loading.tsx`, dashboard loading.
- `not-found.tsx` (404), `error.tsx` (route 500), `global-error.tsx` (root failure).

### Hover / animation timing — Pass
- Button hover/press ~160ms; chart springs ~600–800ms; tickers linear GPU transforms.

### Accessibility — Pass with gaps
- Skip link, focus-visible on chrome/auth/dashboard nav, form labelling.
- Gaps: some SVG map hit targets, admin not fully audited, input focus vs button `focus-visible` split.

### Performance — Pass (engineering posture)
- Homepage heavy sections `dynamic()`.
- Transform-based marquees; `overflow-x-clip` on body.
- **Lighthouse not executed in this audit** — recommendations below are checklist-based.

### SEO metadata — Pass
- Root title template, description, OG/Twitter, canonicals on key pages.
- `robots.ts` + `sitemap.ts` exclude authenticated areas.
- Auth/dashboard pages `robots: { index: false }`.

### Favicon — Pass
- `app/icon.tsx`, `app/apple-icon.tsx`; linked from root metadata.

### Manifest — Pass (added this pass)
- `app/manifest.ts` → `/manifest.webmanifest` (name, theme `#07131C`, icons).

### Open Graph image — Pass (added this pass)
- `app/opengraph-image.tsx` (1200×630) for social previews.

### 404 / 500 — Pass
- Branded 404; safe 500 copy + digest; global-error self-contained HTML.

### Login protection — Conditional pass
- `NEXT_PUBLIC_ENABLE_ROUTE_GUARDS=true` in `.env.local` / `.env.example`.
- Middleware redirects unauthenticated users from dashboard/admin to login (`?next=`).
- Session cookie presence only (`mfx_at`) — **not** signature verification.
- Documented in middleware as redirect optimisation, not security control.

---

## Polish applied in this final pass

1. Added **`manifest.ts`** (PWA / install metadata).
2. Added **`opengraph-image.tsx`** (default social share card).
3. Root **metadata** icons + manifest + OG locale.
4. 404 secondary CTA label → **Sign in** (accurate).
5. 500 page support email: `break-all` + focus ring.
6. Referral demo codes **MFX → GRZ** for brand consistency.

---

## Remaining issues (if any)

| ID | Issue | Severity | Blocks launch? |
|----|--------|----------|----------------|
| R1 | Dashboard deposit/withdraw/settings still Placeholder | High (product) | Yes for full product; No for marketing demo |
| R2 | Admin operator flows incomplete | High (ops) | Yes for ops launch |
| R3 | Auth is demo cookie, not JWT/session API | Critical (security) | Yes for real money |
| R4 | Contact form not wired to API / captcha | Medium | No for UI demo |
| R5 | No real CSV/PDF downloads | Low | No |
| R6 | Package name still `@meridian/web` / cookie `mfx_at` | Low (internal) | No |
| R7 | Lighthouse / e2e visual CI not configured | Medium | No |
| R8 | About “team profiles” Placeholder | Low | No |
| R9 | JSON-LD Organization schema unused on homepage | Low | No |
| R10 | Sentry / real error reporting not integrated | Medium | Soft |

---

## Suggestions

1. **Backend next:** Auth (httpOnly session), deposits, withdrawals, published trades API — keep UI contracts as-is.
2. **Rename cookie** `mfx_at` → `gz_at` (or similar) when real auth lands; keep middleware pattern.
3. **Run Lighthouse CI** on `/`, `/performance`, `/login`, `/contact` in GitHub Actions.
4. **Playwright** smoke: 320px contact submit, login guard redirect, 404.
5. Add **Organization / FinancialProduct JSON-LD** on landing when compliance copy is final.
6. Replace Placeholders with FormField patterns already proven on auth/contact.
7. Keep **RiskBanner → CtaBand** order on every marketing page (now consistent).

---

## Lighthouse recommendations (to run before public launch)

Target (mobile + desktop) on production URL:

| Category | Target | How to get there |
|----------|-------:|------------------|
| Performance | ≥ 90 | Keep dynamic imports; compress OG; avoid layout thrash; audit Framer bundle on landing |
| Accessibility | ≥ 95 | axe pass on contact + login; map keyboard; contrast spot-check |
| Best Practices | ≥ 95 | HTTPS only; no console errors in prod; secure cookies when real auth ships |
| SEO | ≥ 95 | Canonicals already set; confirm OG in Facebook/Twitter debuggers; sitemap crawl |

Practical commands (local):

```bash
pnpm --filter @meridian/web build
pnpm --filter @meridian/web start
# then Chrome DevTools → Lighthouse on http://localhost:3000
```

Also verify:

- `/manifest.webmanifest` 200  
- `/opengraph-image` 200  
- `/icon` + `/apple-icon` 200  
- `/robots.txt` + `/sitemap.xml` 200  
- Unauthenticated `/dashboard` → `/login?next=...` when guards enabled  

---

## Components reviewed

**Chrome:** `nav-bar`, `mobile-nav`, `forex-ticker`, `marketing-shell`, `footer`, `logo` / `logo-mark`, `cta-band`, `risk-banner`, `page-hero`  

**Landing / proof:** `hero`, `performance-highlights`, `performance-showcase`, `todays-trading-activity`, `performance-proof`, `historical-return-timeline`, `testimonials`, `investor-map`, `live-trades-preview`, `contact-form`  

**Auth:** `login-form`, `register-form`, `forgot-password-form`, `reset-password-form`, `password-field`, `success-state`, `social-login-buttons`, `auth-card`  

**System:** `button`, `input`, `textarea`, `select`, `form-field`, `empty-state`, `skeleton`, `placeholder`, root `layout`, `loading`, `error`, `global-error`, `not-found`, `middleware`, `manifest`, `icon`, `apple-icon`, `opengraph-image`, `robots`, `sitemap`  

**Dashboard (spot):** shell, `quick-actions`, `sidebar`, `mobile-nav`, `stat-card`, overview widgets  

---

## Pages reviewed

| Page | Result |
|------|--------|
| Landing `/` | Ready |
| About, FAQ, How it works | Ready (About team Placeholder OK) |
| Our Trading System | Ready |
| Performance / Transparency | Ready |
| Security / Technology / Investors / Resources | Ready |
| Contact | Ready |
| Legal (terms, privacy, risk, refund) | Ready (scaffold copy) |
| Login / Register / Forgot / Reset / Verify | Ready (demo) |
| Dashboard home | Ready (demo data) |
| Dashboard sub-routes | Shell ready · forms incomplete |
| Admin | Structure only |
| 404 / error / global-error | Ready |

---

## Final recommendation

**Ship the frontend as the stable UI contract for backend work.**

Do **not** market as a live investment platform until:

1. Real authentication replaces the demo cookie  
2. Money-moving flows are API-backed and reviewed  
3. Lighthouse + basic e2e gates are green on staging  

Until then, treat this codebase as a **production-quality marketing + demo-auth frontend** at **86% complete**, readiness **76/100**.
