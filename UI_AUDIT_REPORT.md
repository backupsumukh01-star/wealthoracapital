# Growzy Frontend UI Audit Report

**Date:** 2026-08-02  
**Scope:** Full marketing, auth, and dashboard UI (frontend only)  
**Constraint:** No new product features · no redesign · design language preserved  
**Typecheck:** `pnpm --filter @meridian/web typecheck` — pass

---

## 1. Issues found

### Contact
| ID | Issue | Severity |
|----|--------|----------|
| C1 | Contact “form” was a `Placeholder` — no fields, validation, or success state | Critical |
| C2 | Unequal card padding (`p-6` vs `p-6 lg:p-8`) and double chrome from nested Placeholder | Medium |
| C3 | Missing closing `RiskBanner` + `CtaBand` (unlike other marketing pages) | Medium |
| C4 | Tighter hero→content gap via `Section className="pt-0"` | Low |
| C5 | Support email could overflow at 320px (no `break-all`) | Medium |

### Shared chrome
| ID | Issue | Severity |
|----|--------|----------|
| H1 | Mobile drawer header height (68px) ≠ sticky nav (58/61px) | Low |
| H2 | Mobile nav active state used exact path only (missed nested routes) | Medium |
| H3 | Mobile dialog missing `aria-label` | Medium |
| H4 | Logo link lacked visible focus ring | Medium |
| H5 | Footer newsletter input radius ≠ adjacent button | Low |
| H6 | Footer links / social icons lacked focus-visible styles | Medium |
| H7 | CTA band used `size="md"` + `h-12` override (token mismatch) | Low |

### Cross-page consistency
| ID | Issue | Severity |
|----|--------|----------|
| P1 | Closing order flipped: some pages CTA→Risk, others Risk→CTA | Medium |
| P2 | Hero CTAs not full-width on mobile on Performance / Transparency / Trading System | Medium |
| P3 | “Download …” buttons linked to pages (no file download) — misleading copy | Medium |
| P4 | Resources hub cards clipped focus rings (`overflow: hidden` on `card-fill`) | Medium |

### Auth / forms
| ID | Issue | Severity |
|----|--------|----------|
| A1 | Register Country `Select` nested inside `FormField` — id/invalid never reached trigger | High |
| A2 | Terms checkbox error not wired with `aria-invalid` / `aria-describedby` | Medium |
| A3 | Password show/hide toggle missing ring-offset; stayed clickable when disabled | Medium |
| A4 | Apple OAuth row clipped at ~320px | Medium |
| A5 | SuccessState padding differed from AuthCard; emails could overflow | Medium |
| A6 | Auth text links lacked focus-visible styles | Medium |
| A7 | Submit buttons missing `loadingText` for screen readers | Medium |
| A8 | Select / DatePicker missing danger focus ring on invalid | Low |

### Charts / motion / proof
| ID | Issue | Severity |
|----|--------|----------|
| G1 | Historical return bars previously same height (CSS % height bug) — fixed earlier; residual a11y/scroll polish needed | Medium |
| G2 | Chart used hidden scrollbar + `min-w-[520px]` (hard to discover pan) | Medium |
| G3 | Live trades ticker `aria-hidden` with no AT alternative | Medium |
| G4 | Testimonials lacked explicit touch pause | Low |
| G5 | Circular meters fixed 128×128 overflow risk in 2-col grid at 320px | High |

### Dashboard
| ID | Issue | Severity |
|----|--------|----------|
| D1 | `SectionHeader` actions crushed titles at 320px (no stack) | Medium |
| D2 | Quick action tiles / bottom nav / sidebar links missing focus rings | Medium |
| D3 | StatCard hint `?` button missing focus ring | Low |
| D4 | Many settings/deposit/withdraw views still `Placeholder` (expected pre-backend) | Info |

---

## 2. Issues fixed

### Contact (complete pass)
- Replaced Placeholder with real `ContactForm` (name, email, category, message, honeypot, validation, loading, success state).
- Unified card padding to `p-6 lg:p-8`.
- Added `RiskBanner` → `CtaBand`.
- Restored normal `Section` spacing after hero.
- Email links use `break-all` + focus rings.
- Side cards use matching icon treatment and responsive 2-col→1-col stacking.

### Header / footer / CTA
- Drawer height → `58px`; `aria-label="Site menu"`; nested-route active matching.
- Logo focus ring aligned with Button system.
- Footer newsletter `rounded-xl`; social + nav focus rings.
- CTA band uses `size="lg"` (no height override).

### Page consistency
- About / FAQ / How-it-works closing order → **RiskBanner → CtaBand**.
- Performance / Transparency / Our Trading System hero CTAs → `w-full sm:w-auto`.
- Misleading “Download …” labels → “View reports archive” / “View performance archive” where no file is served.
- Resources cards → `focus-visible:ring-inset`.

### Auth
- Country Select wired via `FormField` → `SelectTrigger`.
- Terms checkbox a11y + hint hide on error.
- Password toggle disabled + focus offset.
- Apple button wraps; badge shortened to “Soon”.
- SuccessState padding `p-4 sm:p-8` + `break-words`.
- Auth links + loadingText on login/register/forgot/reset.
- Select + DatePicker invalid focus rings.

### Charts / motion / map
- Historical timeline: scale-to-fit SVG, thin scrollbar, focus rings on range/month chips.
- Live trades: `sr-only` summary for AT; pause on active/touch classes.
- Testimonials: pause on touch / active.
- Trade ticker: pause on active.
- Circular meters: responsive `size-24/28` container; tighter mobile gaps.
- Investor hub chips: focus-visible rings.

### Dashboard
- `SectionHeader` stacks on mobile.
- Quick actions, bottom nav, sidebar, StatCard hint: focus-visible rings.

---

## 3. Remaining UI improvements (not blockers)

1. **Dashboard placeholders** — Profile/security/preferences, deposit/withdraw forms await backend; keep Placeholder until APIs exist (no fake forms that imply persistence).
2. **Admin shell** — Not deeply polished in this pass; same focus-ring patterns should be mirrored when admin forms go live.
3. **Transparency layout** — Some blocks still use ad-hoc `container-page` wrappers vs full `Section`; low visual impact.
4. **Lifecycle 7-column rail** — Labels wrap on mid breakpoints; consider shorter labels or horizontal scroll below `xl`.
5. **Input vs Button focus model** — Fields use `focus:ring` (always); buttons use `focus-visible` + offset. Acceptable; unify later if desired.
6. **Real file downloads** — Wire CSV/PDF when backend ready; labels already honest.
7. **Captcha / rate-limit UI** — Spec mentions captcha for contact; deferred until backend (honeypot present).
8. **Empty / error skeletons** — Marketing pages rely on dynamic import fallbacks; authenticated empty states still sparse on placeholder routes.

---

## 4. Components reviewed

| Area | Components |
|------|------------|
| Chrome | `nav-bar`, `mobile-nav`, `forex-ticker`, `marketing-shell`, `footer`, `logo`, `cta-band`, `risk-banner`, `page-hero` |
| Landing | `hero`, `performance-highlights`, `performance-showcase`, `todays-trading-activity`, `performance-proof`, `historical-return-timeline`, `testimonials`, `investor-map`, `live-activity-toasts`, FAQ/how-it-works blocks |
| Trading system | `circular-meter`, `risk-management`, lifecycle / sessions / strategies (spot-checked) |
| Contact | `contact-form` (new), contact page |
| Auth | `login-form`, `register-form`, `forgot-password-form`, `reset-password-form`, `password-field`, `social-login-buttons`, `success-state`, `auth-card` |
| UI kit | `button`, `input`, `textarea`, `select`, `date-picker`, `form-field`, `checkbox`, `card` |
| Dashboard | `page-header` / `SectionHeader`, `quick-actions`, `mobile-nav`, `sidebar`, `stat-card` |
| Charts | `monthly-performance-chart`, `historical-return-timeline`, `live-trades-preview` |

---

## 5. Pages reviewed

| Page | Status |
|------|--------|
| Landing `/` | Reviewed + related component fixes |
| About | Closing band order fixed |
| Our Trading System | Hero CTA width fixed |
| Performance | Hero CTAs + download copy + charts |
| Transparency | Hero CTAs + download copy |
| Security | Spot-checked; meters fixed via shared component |
| Technology | Spot-checked |
| Investors | Spot-checked; map focus fixed |
| Resources | Focus rings on hub cards |
| Contact | Fully rebuilt form + layout |
| FAQ / How it works | Closing band order fixed |
| Login / Register / Forgot / Reset | Form a11y + focus + loading |
| Dashboard home + shell | Focus + SectionHeader stacking |
| Dashboard placeholder routes | Noted — intentionally unfinished |

---

## 6. Responsive status

| Breakpoint | Status |
|------------|--------|
| 320–430px | Contact form stacks; meters scale; hero CTAs full-width; email break; Apple OAuth wraps; SectionHeader stacks |
| 768px | Grids collapse cleanly; ticker/header sticky stack intact |
| 1024–1440px | Two-column contact + showcase layouts OK |
| 1920px | Container max-width holds; no stretch bugs found |

**Known:** No intentional page-level horizontal scroll. Chart/map chips may scroll inside their own overflow containers (expected).

---

## 7. Accessibility status

| Check | Status |
|-------|--------|
| Keyboard focus on primary chrome | Improved (logo, footer, nav drawer, dashboard nav) |
| Form wiring (labels, invalid, describedby) | Contact + register country fixed |
| Loading announcements | Auth submits use `loadingText` |
| Touch targets | Buttons ≥40–44px; hub chips `h-12` |
| Contrast | Existing emerald-on-dark system retained; no random accents introduced |
| Live regions / AT for tickers | `sr-only` summaries added; decorative loops `aria-hidden` |
| Reduced motion | Honored on tickers, charts, splash patterns |

**Gaps remaining:** Some SVG map nodes still mouse-first; admin surfaces not fully audited.

---

## 8. Performance observations

- Marketing heavy sections already use `dynamic()` on the homepage — keep that pattern.
- Trade/testimonial tickers use CSS `transform` + `will-change` (GPU-friendly); fixed heights prevent CLS.
- Historical timeline uses SVG + Framer spring; fixed viewport height — no layout shift.
- Contact form is client-only with a short simulated delay — no network until backend.
- No new large dependencies added in this audit.

---

## 9. Suggestions for future improvements (post-backend)

1. Wire contact form to API + captcha + rate limits; keep current validation UX.
2. Replace dashboard Placeholders with real forms using the same `FormField` patterns.
3. Serve real CSV/PDF downloads; restore “Download” wording only when files exist.
4. Unify focus model (`focus-visible` + offset) across inputs and buttons.
5. Add visual regression snapshots (Playwright) at 320 / 768 / 1440 for Contact, Auth, Landing.
6. Prefetch dashboard route after successful demo login.
7. Consider a shared `FocusRing` utility class to avoid class drift.

---

## Summary

The unfinished Contact page and the highest-impact consistency/a11y bugs are addressed. Design language (dark emerald glass, Geist, motion tokens) is unchanged. Remaining work is mostly placeholder dashboard/admin surfaces and backend-dependent downloads — appropriate for the start of backend development.
