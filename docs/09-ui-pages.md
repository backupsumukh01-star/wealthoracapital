# 09 — UI Page List

Every route in the application, with its sections, states and data source. Forty-one routes across
four groups.

---

## Route map

| Group | Routes | Auth | Rendering |
|-------|--------|------|-----------|
| Marketing | 12 | Public | Server components, static + ISR |
| Auth | 8 | Public / guest-only | Client components |
| Dashboard | 13 | Authenticated | Server shell + client data |
| Admin | 18 | Admin role | Client components |

---

## 1. Marketing

### 1.1 `/` — Landing page

The centrepiece. Twelve sections, each answering the next question in the visitor's head.

| # | Section | Content | Motion |
|---|---------|---------|--------|
| 1 | **Nav** | Logo, links (Performance, How it works, About, FAQ), Login, **Start investing** | Transparent → solid blur on scroll past 80px |
| 2 | **Hero** | Headline, one-sentence subhead, dual CTA, trust line ("N investors · $X managed") | Staggered word reveal; original animated equity curve drawing itself over 1.2s |
| 3 | **Trust strip** | Security badges, payment methods, uptime — quiet, small | Fade in |
| 4 | **Statistics** | 4 figures: total distributed, active investors, avg monthly return, trading days | Count-up on first view, tabular figures |
| 5 | **Performance showcase** | Interactive chart with 1M/6M/1Y/All toggles; monthly return bars; real aggregate data | Chart path draws on scroll into view |
| 6 | **How it works** | 4 steps: Create account → Deposit → We trade → Earn daily | Scroll-linked progress rail; steps activate as they enter |
| 7 | **Live trades preview** | Last 5 public trades — pair, direction, entry, exit, return | Row-by-row stagger |
| 8 | **Advantages** | 6 cards: daily transparency, real trades shown, no lock-in, withdraw anytime, human desk, full history | Grid stagger, subtle hover lift |
| 9 | **Testimonials** | Real, attributed, with consent; photo, name, tenure, quote | Auto-advancing carousel that pauses on hover and on focus |
| 10 | **FAQ** | 8–10 questions in an accordion, with `FAQPage` structured data | Height animation |
| 11 | **Risk disclosure** | Prominent, honest, above the final CTA — not hidden in the footer | Static, deliberately |
| 12 | **CTA + Footer** | Final conversion band; footer with product/company/legal/social columns | Gradient wash |

**Data:** `GET /performance/public` and `GET /settings/public`, fetched server-side with ISR
(`revalidate: 900`). The page is fully static between revalidations.

**States:** if the public performance API fails, the statistics and performance sections render
with last-known cached values and no error is shown to the visitor — a marketing page must never
show a broken widget.

**Originality note:** the section *order* above is a conversion sequence common to the category, but
the layout of each section, the equity-curve visual, the scroll-linked step rail, the palette, the
type pairing and all copy are ours. Nothing is templated from another product.

### 1.2 Other marketing routes

| Route | Purpose | Notable content |
|-------|---------|-----------------|
| `/how-it-works` | Deep-dive on the process | Expanded 4 steps, deposit walkthrough with screenshots, distribution explanation, worked example of a daily return |
| `/performance` | Public track record | Full monthly table, equity curve, win rate, best/worst month, methodology note, prominent past-performance disclaimer |
| `/about` | Who runs the desk | Team, strategy summary, risk approach, contact |
| `/faq` | Full FAQ | Categorised: getting started, deposits, returns, withdrawals, security |
| `/contact` | Support | Form (honeypot + captcha + rate limit), email, response-time expectation |
| `/legal/terms` | Terms of Service | Counsel-drafted |
| `/legal/privacy` | Privacy Policy | Incl. the data-retention tension noted in [04 §6](./04-database-schema.md#6-data-lifecycle) |
| `/legal/risk-disclosure` | Risk Disclosure | Must be accepted at registration |
| `/legal/refund-policy` | Refund Policy | Counsel-drafted |
| `/404`, `/500` | Error pages | On-brand, with a route back |

---

## 2. Auth

Shared layout: centred card, brand mark, minimal chrome, a subtle animated background that
respects reduced motion.

| Route | Fields / content | Key states |
|-------|-----------------|-----------|
| `/login` | Email, password, remember me, Google button, forgot link | Loading, invalid credentials, locked out, unverified, suspended |
| `/register` | First/last name, email, password + live strength meter, terms checkbox, risk checkbox, optional referral code, Google button | Field errors, weak/breached password, generic "check your email" success |
| `/verify-email` | Token consumed from the query string | Verifying, success, expired (resend), invalid, already verified |
| `/verify-email/sent` | Instructional page | Resend with a 60s cooldown, "check spam" hint, support link |
| `/forgot-password` | Email | Always the same success message |
| `/reset-password` | New password + confirm, strength meter | Invalid/expired token, mismatch, success → redirect |
| `/oauth/callback` | Spinner while cookies are exchanged | Success → `next` path; failure → `/login` with a reason |
| `/logout` | Server action, no UI | — |

Every auth page includes a route back to `/` and a link to the alternate action (login ↔ register).
Dead ends are the most common auth UX failure.

---

## 3. Dashboard (authenticated)

Shared layout: collapsible sidebar (icon-only under 1280px, sheet on mobile), topbar with search,
notification bell, theme toggle and user menu.

### 3.1 `/dashboard`

| Zone | Content |
|------|---------|
| Header | Greeting, date, "Today's return published / pending" pill |
| Stat row | Wallet balance · Today's profit · Total profit · ROI % — each with a period-over-period delta |
| Chart | Equity curve, range toggle 7d/30d/90d/1y/all, tooltip with balance and daily profit |
| Recent trades | Last 5 trades with pair, direction, entry, exit, return; link to full history |
| Activity | Last 5 ledger events in plain language |
| Side panel | Pending deposits/withdrawals, latest notifications, quick actions |

**Data:** a single `GET /wallet/summary`.
**States:** skeleton on load; onboarding checklist when the balance is zero and no deposits exist;
a banner if a deposit is awaiting proof; an error card with retry if the call fails.

### 3.2 Money routes

| Route | Sections | States |
|-------|----------|--------|
| `/deposit` | Amount input with quick-select chips, method picker, method instructions with copy buttons, reference to quote, submit, then a proof uploader | Validating, below minimum, submitted (awaiting proof), upload progress, upload rejected, success |
| `/deposit/history` | Filterable table: reference, amount, method, status, date, proof thumbnail | Empty, loading, rejected-with-reason expandable |
| `/withdraw` | Available balance, amount, payout method picker, fee breakdown, review step, confirm | Insufficient funds, cooldown active with unlock time, no payout method, success with reference |
| `/withdraw/history` | Table: reference, amount, fee, net, destination, status, date | Empty, pending, paid with transaction reference |
| `/transactions` | Full personal ledger: type, description, amount, balance after, date; filter by type and range; CSV export | Empty, loading, filtered-empty |

### 3.3 History & performance

| Route | Content |
|-------|---------|
| `/trades` | Filter bar (date range, pair, direction, outcome, return range, search), sortable paginated table, expandable rows with notes, export CSV/PDF |
| `/trades/[tradeId]` | Full detail: prices, stop/target, lots, timestamps, desk notes, optional chart image, and the user's own earning from that day |
| `/performance` | Lifetime summary tiles, equity curve, monthly grid (12 months × return %/profit), yearly rollup, best/worst day, win rate, distribution log, statement PDF export |

All filter, sort and pagination state lives in the URL.

### 3.4 Account

| Route | Content |
|-------|---------|
| `/notifications` | List with unread emphasis, type filter, mark-read, mark-all, dismiss, infinite scroll |
| `/settings/profile` | Name, phone, country, timezone, avatar upload |
| `/settings/security` | Change password, active session list with device/IP/last-used, revoke one or all, 2FA setup (v1.1) |
| `/settings/payout-methods` | List, add, edit, delete, set default |
| `/settings/preferences` | Notification matrix (event × channel), theme, number format |

---

## 4. Admin

Distinct chrome from the investor area — different sidebar treatment and an environment badge —
so nobody ever confuses the two. Non-admins get a 404 on all of these.

| Route | Content |
|-------|---------|
| `/admin` | Action queues, financial overview, user overview, alerts. See [07 §3](./07-admin-flow.md#3-admin-dashboard--admin) |
| `/admin/users` | Search, filters, sortable table, CSV export |
| `/admin/users/[id]` | Tabs: overview, ledger, deposits, withdrawals, distributions, sessions, activity. Actions: suspend, activate, adjust balance 👑, revoke sessions, change role 👑 |
| `/admin/deposits` | Queue with age highlighting, bulk approve, filters |
| `/admin/deposits/[id]` | Review drawer: zoomable proof viewer, user history, approve/reject with structured reasons |
| `/admin/withdrawals` | Queue with total pending amount |
| `/admin/withdrawals/[id]` | Destination snapshot, risk flags, approve → mark paid with transaction reference |
| `/admin/trades` | All trades incl. non-public, filters, bulk actions |
| `/admin/trades/new` | Fast entry form with auto-suggested return and reset-and-stay behaviour |
| `/admin/trades/[id]` | Edit — locked once the day is distributed |
| `/admin/daily-return` | The engine screen: today's trades, computed return, preview, apply. See [07 §7](./07-admin-flow.md#7-applying-the-daily-return--admindaily-return) |
| `/admin/daily-return/[runId]` | Run detail: status, totals, rounding delta, per-user distributions, CSV export, reverse 👑 |
| `/admin/notifications` | Send targeted notifications, view delivery status |
| `/admin/broadcast` | Compose → segment → preview → test send → send/schedule → stats |
| `/admin/audit-log` | Filter by actor/action/target/date, expandable before/after diffs |
| `/admin/reports` | AUM over time, deposit/withdrawal flows, user growth, distributed returns |
| `/admin/settings/platform` | Name, logo, support email, timezone, maintenance mode 👑 |
| `/admin/settings/payment-methods` | CRUD for deposit channels 👑 |
| `/admin/settings/staff` | Admin accounts, invite, revoke 👑 |
| `/admin/settings/email-templates` | Edit subject/body, render preview 👑 |

---

## 5. Required states for every data view

A view is not complete until all seven exist. This is a review checklist, not a suggestion.

| State | Requirement |
|-------|-------------|
| **Loading** | Skeleton matching the final layout — never a centred spinner on a full page (it causes layout shift and looks broken) |
| **Empty** | Explains what will appear here and offers the one action that makes it appear |
| **Filtered-empty** | Distinct from empty: "No trades match these filters" + a clear-filters button |
| **Error** | Plain-language message, a retry button, and the request ID for support |
| **Partial** | Some widgets loaded, some failed — failures are isolated, never blanking the page |
| **Success** | The data |
| **Offline** | A banner; cached data stays visible and is marked stale |

---

## 6. Responsive behaviour

| Breakpoint | Width | Behaviour |
|-----------|-------|-----------|
| `sm` | 640px | Single column; tables become cards; sidebar is a sheet |
| `md` | 768px | Two-column stat grids; filter bars wrap |
| `lg` | 1024px | Sidebar visible as icons; tables return to rows |
| `xl` | 1280px | Full sidebar with labels; dashboard gains its side panel |
| `2xl` | 1536px | Max content width 1440px, centred |

**Financial data never scrolls horizontally on mobile.** Tables collapse into cards where each row
becomes a labelled block. A user squinting at a horizontally scrolling balance column is a user who
stops trusting the product.

---

## 7. Accessibility requirements

- Every interactive element is keyboard reachable with a visible `:focus-visible` ring
- Modals and drawers trap focus and restore it on close; `Esc` always closes
- Charts have an accessible table alternative behind a "View as table" toggle
- Colour is never the only signal: profit/loss carries a sign and an arrow, not just red/green
- Contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text and UI borders
- Live regions announce toasts, and announce when a balance updates
- Forms use real `<label>` elements, `aria-describedby` for errors, and `aria-invalid`
- All animation is disabled under `prefers-reduced-motion: reduce`
- Automated axe checks in CI plus a manual keyboard-only pass at each phase exit
