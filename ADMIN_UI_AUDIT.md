# ADMIN_UI_AUDIT.md

Growzy Capital — Admin Operating System (UI-only)  
Generated: 2026-08-03  
Scope: Mock Admin OS + CMS. No backend / DB / APIs.

---

## Frontend completion %

| Area | % | Notes |
|------|---|-------|
| Ops queues (users, KYC, deposits, withdrawals, returns) | 95% | Lifecycle-backed |
| Landing CMS | 95% | Draft / preview / publish → landing hero |
| Ticker manager | 95% | Live landing tape |
| Performance CMS | 90% | Publish syncs landing numbers |
| Trade management | 95% | Draft / publish / archive / schedule |
| Payment settings | 95% | INR + unlimited crypto wallets |
| Report generator | 90% | Filters + CSV/Excel/PDF demo export |
| Notification builder | 95% | Audiences + channels + preview + send |
| Email template builder | 95% | 16 templates · desktop/mobile preview |
| Global settings | 95% | Limits, channels, switches, roles matrix |
| Live activity manager | 95% | Landing toasts driven by config |
| Announcement center | 90% | Types + schedule + publish |
| Wallet manager | 90% | Adjust / bonus / freeze / unlock + ledger |
| User profile timeline | 90% | Timeline tab on user detail |
| Audit log | 95% | Live OS audit + seed history |
| Dashboard analytics | 95% | Visitors, conversion, online, queues, charts |
| Feature toggles | 95% | One-click switches |
| Support center | 90% | Reply / assign / close / notes |
| Admin roles | 85% | Matrix display; enforcement deferred to API |
| Content CMS | 90% | FAQs, pages, testimonials |
| **Overall Admin OS** | **~93%** | Ready for backend swap |

---

## Completed

1. **Landing Page CMS** — `/admin/cms/landing` · Save draft · Preview · Publish · hero, stats, contact, social, risk, popup  
2. **Live Market Ticker** — `/admin/ticker` · add/remove/reorder/enable/feature → homepage tape  
3. **Performance Management** — `/admin/performance` · publish metrics + monthly/yearly series  
4. **Trade Management** — `/admin/trades` · draft/published/archived/scheduled · edit/delete  
5. **Payment Settings** — `/admin/settings/payment-methods` · INR/UPI/GPay/PhonePe/Paytm/Bank + crypto wallets  
6. **Report Generator** — `/admin/reports` · date/user/country + domain filters · CSV/Excel/PDF  
7. **Notification Builder** — `/admin/notifications` · ALL/SELECTED/SINGLE/COUNTRY/VIP · multi-channel · preview  
8. **Email Template Builder** — `/admin/email-templates` · all lifecycle templates · desktop/mobile  
9. **Global Settings** — `/admin/settings/global` · company, limits, channels, switches, roles  
10. **Live Activity Manager** — `/admin/activity` · ranges, delay, speed, enable, generate demo  
11. **Announcement Center** — `/admin/announcements` · maintenance/promo/news/banners · schedule  
12. **Wallet Manager** — `/admin/wallets` · adjust/bonus/freeze/unlock + audit note  
13. **User Profile Timeline** — user detail → Timeline tab  
14. **Audit Log** — `/admin/audit-log` · admin, IP, browser, old/new  
15. **Dashboard Analytics** — `/admin` overview KPIs + charts  
16. **Feature Toggles** — `/admin/feature-toggles`  
17. **Support Center** — `/admin/support`  
18. **Admin Roles** — matrix in global settings + `/admin/settings/roles`  
19. **Content CMS** — `/admin/cms/content` · FAQ / about / terms / privacy / contact / footer / testimonials  
20. **Shared mock store** — `growzy_admin_os_v1` localStorage via `AdminOsProvider`

Landing auto-updates for: hero copy, ticker pairs, live activity feed.

---

## Missing / partial

| Item | Gap |
|------|-----|
| Role enforcement in UI | Roles displayed; routes not gated by permission |
| Real file uploads (QR, trade image, ticket attachments) | URL fields only |
| Excel/PDF binary download | Toast simulation |
| Homepage popup render | CMS fields exist; marketing popup mount optional |
| FAQ / testimonials live bind on every marketing page | Store ready; homepage FAQ still mostly static seed |
| Investor trade history auto-merge from CMS trades | Partial — admin publishes to OS store; investor screens may still show demo trades |
| Drag-and-drop ticker reorder | Arrow up/down instead |
| Multi-admin concurrent edit | Single browser localStorage |

---

## Future backend APIs needed

### CMS / marketing
- `GET/PUT /admin/cms/landing` · `POST …/publish`
- `CRUD /admin/ticker`
- `GET/PUT /admin/performance` · `POST …/publish`
- `CRUD /admin/announcements`
- `CRUD /admin/cms/pages` · FAQs · testimonials
- `GET/PUT /admin/activity-config`

### Trading / money
- Existing trade + daily return APIs (docs/05, docs/12)
- `CRUD /admin/payment-methods/inr` · `CRUD /admin/payment-methods/crypto`
- `POST /admin/wallets/adjust` · freeze/unlock

### Comms
- `POST /admin/notifications/campaigns`
- `CRUD /admin/email-templates`
- `CRUD /admin/support/tickets` · reply/assign/close

### Platform
- `GET/PUT /admin/settings/global`
- `GET/PUT /admin/feature-toggles`
- `GET /admin/analytics/overview`
- `GET /admin/audit` (append-only)
- `POST /admin/reports/export` (CSV/XLSX/PDF)
- `GET /admin/users/:id/timeline`

---

## Database tables needed

Aligned with docs/04 + Admin OS shapes:

| Table | Purpose |
|-------|---------|
| `cms_landing` | Published + draft homepage content |
| `cms_pages` | About/terms/privacy/contact/footer |
| `cms_faqs` | FAQ entries |
| `cms_testimonials` | Social proof |
| `market_ticker_pairs` | Tape pairs + order/flags |
| `performance_snapshots` | Published programme metrics + series JSON |
| `published_trades` | Trade CMS with status/schedule |
| `payment_methods_inr` | UPI/bank rails |
| `payment_crypto_wallets` | Unlimited wallets |
| `email_templates` | Editable HTML templates |
| `platform_settings` | Global settings singleton |
| `feature_toggles` | Boolean flags |
| `live_activity_config` | Demo activity generator |
| `announcements` | Scheduled announcements |
| `wallet_adjustments` | Admin wallet ledger |
| `user_timeline_events` | Immutable per-user events |
| `admin_audit_log` | Append-only operator audit |
| `notification_campaigns` | Sent campaigns |
| `support_tickets` / `support_messages` | Support center |
| `admin_roles` / `admin_staff` | RBAC |

---

## Design constraints honored

- No redesign of investor dashboard or approved landing layout language  
- Existing dark glass `AdminPanel` / tokens reused  
- Mock-only shared state prepared for API swap (`loadAdminOs` / `saveAdminOs`)

---

## Manual QA (admin)

1. Login `/admin/login` → `admin@growzy.com` / `GrowzyAdmin2026!` / OTP `123456`  
2. Landing CMS → edit hero → Publish → open `/` → copy updates  
3. Ticker → disable a pair → tape updates  
4. Activity → disable → toasts stop  
5. Trades → publish → appears in library  
6. Payments → add crypto wallet → persists refresh  
7. Notifications → preview → send → history + investor notify event  
8. Wallets → adjust with note → ledger + audit  
9. Support → reply / close  
10. Feature toggles → flip Deposit → reflected in global settings sync where wired  
11. Mobile/tablet: sidebar sheet + tables scroll horizontally without page overflow  

---

## Nav map (new)

Growth & CMS · Landing CMS · Content CMS · Live activity · Announcements  
Trading · Performance · Market ticker  
Ops · Wallets · Support  
Comms · Email templates  
Governance · Feature toggles · Global settings  
