# Growzy — PostgreSQL Database Schema (Architecture)

**Engine:** PostgreSQL 16  
**ORM target:** Prisma (implementation later)  
**Document type:** Architecture only — **no SQL DDL**  
**Money:** decimal fixed-precision amounts · **Percentages:** fixed-precision ratios · **Time:** UTC timestamptz · **IDs:** UUID v4  

> **Final frontend pass:** Ensure tables cover `cms_platform` (or JSON document), `cms_revisions`, `media_assets` (+ folder), `feature_flags`, `role_permissions`, `system_health_snapshots` (optional), `backup_jobs`, and searchable audit columns (`reason`, IP, UA). Aligns with Admin OS v4.

This is the authoritative logical schema for Growzy Capital: identity, money ledger, trading/returns, communications, support, CMS, and governance.

---

## 1. Design principles

1. **Ledger is truth; wallet is cache.** Reconstructable: sum of ledger amounts for a wallet equals `wallet.balance` after every committed posting.
2. **Append-only money history.** Corrections are compensating ledger entries — never mutate or delete posted ledger rows.
3. **Idempotency on money writes.** Deposits, withdrawals, return distributions, and admin adjustments carry unique idempotency keys.
4. **Soft lifecycle for people and content.** Users close via status; CMS and tickets archive/soft-hide; financial history is retained.
5. **Single currency in v1 (USD).** Schema leaves a currency column for future multi-currency without redesign.
6. **Draft → publish for public content.** Marketing/CMS entities separate draft from live snapshots.
7. **Staff are users with elevated roles** (plus optional role-assignment table for fine-grained RBAC).
8. **Audit every privileged mutation.** Immutable audit trail with actor, IP, user-agent, before/after payloads.

---

## 2. Entity relationship overview

```
users ─┬─ wallets ── ledger_entries
       ├─ sessions / refresh_tokens / oauth_accounts
       ├─ verification_tokens
       ├─ documents (KYC)
       ├─ deposits ── payment_methods (platform rails)
       ├─ withdrawals ── payout_methods (user destinations)
       ├─ notifications / notification_preferences
       ├─ support_tickets ── support_messages ── support_attachments
       ├─ referral_attributions
       └─ admin_role_assignments ── roles / permissions (RBAC)

trading_days ── trades
      │
      └── daily_return_runs ── profit_distributions ── ledger_entries

cms_landing_revisions / cms_landing_published
cms_pages · cms_faqs · cms_testimonials
cms_ticker_pairs · cms_ticker_display
cms_performance_snapshots
cms_announcements · cms_activity_config
cms_media_assets · cms_report_docs · cms_site_seo
cms_revisions

settings · feature_toggles · email_templates · email_logs
notification_campaigns · audit_logs · outbox_events · idempotency_keys
```

---

## 3. Enums (logical)

Use PostgreSQL native enums (or Prisma enums). Values are stable API contracts.

### Identity & access

| Enum | Values |
|------|--------|
| `user_role` | `USER`, `ADMIN`, `SUPER_ADMIN` |
| `staff_role_key` | `SUPER_ADMIN`, `FINANCE`, `SUPPORT`, `KYC_OFFICER`, `TRADING_MANAGER`, `CONTENT_MANAGER`, `VIEWER` |
| `user_status` | `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `CLOSED` |
| `kyc_status` | `NOT_STARTED`, `PENDING`, `APPROVED`, `REJECTED` |
| `verification_purpose` | `EMAIL_VERIFY`, `PASSWORD_RESET`, `EMAIL_CHANGE`, `ADMIN_INVITE`, `TWO_FA_SETUP` |

### Money

| Enum | Values |
|------|--------|
| `deposit_status` | `PENDING`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `CANCELLED` |
| `withdrawal_status` | `PENDING`, `UNDER_REVIEW`, `APPROVED`, `PAID`, `REJECTED`, `CANCELLED` |
| `payment_method_type` | `BANK_TRANSFER`, `CRYPTO`, `MOBILE_WALLET`, `UPI`, `OTHER` |
| `ledger_entry_type` | `DEPOSIT_APPROVED`, `WITHDRAWAL_LOCKED`, `WITHDRAWAL_COMPLETED`, `WITHDRAWAL_REFUNDED`, `PROFIT_DISTRIBUTION`, `PROFIT_REVERSAL`, `ADJUSTMENT_CREDIT`, `ADJUSTMENT_DEBIT`, `FEE`, `BONUS` |
| `wallet_kind` | `MAIN` (v1 only; future: `BONUS`, `TRADING`, `REFERRAL`) |

### Trading & returns

| Enum | Values |
|------|--------|
| `trade_direction` | `BUY`, `SELL` |
| `trade_outcome` | `WIN`, `LOSS`, `BREAKEVEN` |
| `trade_source` | `MANUAL`, `CSV_IMPORT`, `MT5_IMPORT`, `API` |
| `publish_status` | `DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED` |
| `trading_day_status` | `DRAFT`, `PUBLISHED`, `DISTRIBUTED`, `REVERSED` |
| `daily_return_run_status` | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `REVERSED` |
| `return_basis` | `BALANCE`, `INVESTED` |

### Communications & support

| Enum | Values |
|------|--------|
| `notification_type` | `DEPOSIT`, `WITHDRAWAL`, `DAILY_RETURN`, `SECURITY`, `ANNOUNCEMENT`, `KYC`, `SYSTEM`, `SUPPORT` |
| `notification_channel` | `IN_APP`, `EMAIL`, `PUSH`, `SMS` |
| `email_log_status` | `QUEUED`, `SENT`, `FAILED`, `SKIPPED` |
| `campaign_status` | `DRAFT`, `SCHEDULED`, `SENDING`, `SENT`, `CANCELLED` |
| `campaign_audience` | `ALL`, `SELECTED`, `COUNTRY`, `VIP`, `SINGLE` |
| `support_category` | `ACCOUNT`, `DEPOSIT`, `WITHDRAWAL`, `PERFORMANCE`, `KYC`, `TECHNICAL`, `OTHER` |
| `support_status` | `OPEN`, `ASSIGNED`, `PENDING_USER`, `PENDING_STAFF`, `RESOLVED`, `CLOSED` |
| `support_priority` | `LOW`, `NORMAL`, `HIGH`, `URGENT` |

### Documents & CMS

| Enum | Values |
|------|--------|
| `document_type` | `ID_FRONT`, `ID_BACK`, `SELFIE`, `PROOF_OF_ADDRESS`, `PAYMENT_PROOF`, `OTHER` |
| `document_status` | `PENDING`, `APPROVED`, `REJECTED` |
| `media_kind` | `IMAGE`, `ICON`, `PDF`, `VIDEO`, `SVG`, `LOGO`, `BACKGROUND`, `OTHER` |
| `report_doc_type` | `MONTHLY_PDF`, `WEEKLY_PDF`, `DAILY`, `PERFORMANCE_PDF`, `EXCEL`, `CSV` |
| `announcement_type` | `MAINTENANCE`, `PROMOTION`, `NEWS`, `RETURN`, `POPUP`, `TOP_BANNER`, `DASHBOARD_BANNER` |
| `announcement_priority` | `LOW`, `NORMAL`, `HIGH`, `URGENT` |
| `display_page` | `ALL`, `HOME`, `DASHBOARD`, `WALLET` |
| `cms_module` | `LANDING`, `PAGE`, `FAQ`, `TESTIMONIAL`, `TICKER`, `PERFORMANCE`, `ANNOUNCEMENT`, `SITE_SEO`, `REPORT`, `MEDIA` |

---

## 4. Tables

Logical column types below are architectural (not DDL).  
**Common columns** when listed as “timestamps”: `created_at`, `updated_at` (UTC).  
**Soft-delete column** when applicable: `deleted_at` (null = active).

---

### 4.1 Identity & sessions

#### `users`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | citext | Unique among non-deleted |
| email_verified_at | timestamptz | Null until verified |
| password_hash | text | Null if OAuth-only |
| first_name, last_name | varchar | |
| phone | varchar | Nullable |
| country | char(2) | ISO 3166-1 |
| timezone | text | Default UTC |
| avatar_key | text | Object storage key |
| role | `user_role` | Coarse gate |
| status | `user_status` | Soft close = `CLOSED` |
| kyc_status | `kyc_status` | |
| kyc_rejection_reason | text | Nullable |
| referral_code | varchar | Unique nullable |
| referred_by_id | UUID FK → users | Nullable |
| two_factor_secret | text | Encrypted at rest |
| two_factor_enabled_at | timestamptz | |
| last_login_at | timestamptz | |
| deleted_at | timestamptz | Soft delete (rare; prefer `CLOSED`) |
| timestamps | | |

**Foreign keys:** `referred_by_id` → `users.id` (ON DELETE SET NULL)  
**Indexes:** unique email (partial where `deleted_at IS NULL`); `(status)`; `(role)`; `(kyc_status)`; `(referred_by_id)`; `(created_at DESC)`  
**Constraints:** closed users retain FKs; never hard-delete if ledger exists

#### `admin_role_assignments`

Fine-grained staff RBAC (future-ready; aligns with Content/Finance/Viewer).

| Column | Notes |
|--------|-------|
| id | UUID PK |
| user_id | FK → users (staff only) |
| role_key | `staff_role_key` |
| granted_by_id | FK → users nullable |
| granted_at | timestamptz |
| revoked_at | timestamptz nullable (soft revoke) |

**Indexes:** unique `(user_id, role_key)` where `revoked_at IS NULL`; `(role_key)`

#### `sessions`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| user_id | FK → users |
| refresh_token_hash | text |
| ip | inet nullable |
| user_agent | text nullable |
| expires_at | timestamptz |
| revoked_at | timestamptz nullable |
| created_at | |

**Indexes:** `(user_id, expires_at)`; `(refresh_token_hash)` unique

#### `oauth_accounts`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| user_id | FK → users |
| provider | text (e.g. google) |
| provider_user_id | text |
| timestamps | |

**Constraints:** unique `(provider, provider_user_id)`

#### `verification_tokens`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| user_id | FK nullable (invite may precede user) |
| email | citext |
| purpose | `verification_purpose` |
| token_hash | text unique |
| expires_at | timestamptz |
| consumed_at | timestamptz nullable |
| created_at | |

**Indexes:** `(email, purpose)`; `(expires_at)`

#### `admin_invites` (optional v1)

| Column | Notes |
|--------|-------|
| id | UUID PK |
| email | citext |
| role_key | `staff_role_key` |
| invited_by_id | FK → users |
| token_hash | text |
| accepted_at / expires_at / revoked_at | |

---

### 4.2 Money

#### `wallets`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| user_id | Unique FK → users (v1: one wallet) |
| kind | `wallet_kind` default MAIN |
| currency | char(3) default USD |
| balance | decimal ≥ 0 |
| locked_balance | decimal ≥ 0 and ≤ balance |
| invested_amount | decimal ≥ 0 |
| total_profit | decimal |
| total_deposited | decimal ≥ 0 |
| total_withdrawn | decimal ≥ 0 |
| version | int optimistic concurrency |
| timestamps | |

**Foreign keys:** `user_id` → users ON DELETE RESTRICT  
**Indexes:** unique `(user_id, kind)`; `(currency)`  
**Derived:** available = balance − locked_balance

#### `ledger_entries` (immutable)

| Column | Notes |
|--------|-------|
| id | UUID PK |
| wallet_id | FK → wallets |
| user_id | FK → users (denormalised) |
| type | `ledger_entry_type` |
| amount | signed decimal |
| balance_before / balance_after | decimal; after = before + amount |
| reference_type | text (polymorphic) |
| reference_id | UUID nullable |
| idempotency_key | text unique |
| description | text nullable |
| created_by | FK users nullable (system null) |
| created_at | only (no updated_at) |

**Indexes:** `(wallet_id, created_at)`; `(user_id, created_at)`; `(reference_type, reference_id)`; unique `idempotency_key`  
**Constraints:** no UPDATE/DELETE (DB privilege / trigger policy); CHECK balance continuity

#### `payment_methods` (platform deposit rails)

| Column | Notes |
|--------|-------|
| id | UUID PK |
| type | `payment_method_type` |
| name / label | text |
| instructions | text |
| account_details | jsonb |
| min_amount / max_amount | decimal |
| is_active | boolean |
| sort_order | int |
| deleted_at | soft delete |
| timestamps | |

**Indexes:** `(is_active, sort_order)` partial active

#### `deposits`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| user_id | FK → users |
| payment_method_id | FK → payment_methods |
| amount | decimal > 0 |
| fee | decimal ≥ 0 |
| credited_amount | decimal nullable |
| status | `deposit_status` |
| proof_key / proof_mime | storage metadata |
| external_reference | text nullable |
| user_reference | text nullable |
| admin_note | text nullable |
| rejection_reason | text nullable |
| reviewed_by_id | FK users nullable |
| reviewed_at | timestamptz |
| idempotency_key | unique |
| timestamps | |

**Indexes:** `(user_id, created_at DESC)`; `(status, created_at)`; `(payment_method_id)`  
**FK:** user ON DELETE RESTRICT; payment_method ON DELETE RESTRICT

#### `payout_methods` (investor destinations)

| Column | Notes |
|--------|-------|
| id | UUID PK |
| user_id | FK → users |
| label | text |
| type | `payment_method_type` |
| details_encrypted / masked_details | store secrets carefully |
| is_default | boolean |
| is_verified | boolean |
| deleted_at | soft delete |
| timestamps | |

**Indexes:** `(user_id)` where not deleted; at most one default per user (partial unique)

#### `withdrawals`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| user_id | FK → users |
| payout_method_id | FK nullable (SET NULL if method soft-deleted) |
| amount | decimal > 0 |
| fee_amount | decimal ≥ 0 |
| net_amount | decimal |
| status | `withdrawal_status` |
| destination_snapshot | jsonb immutable copy at request |
| admin_note / rejection_reason | text |
| external_reference | bank/tx ref |
| reviewed_by_id / reviewed_at / paid_at | |
| idempotency_key | unique |
| timestamps | |

**Indexes:** `(user_id, created_at DESC)`; `(status, created_at)`  
**CHECK:** net_amount = amount − fee_amount (application or DB check)

#### `idempotency_keys`

| Column | Notes |
|--------|-------|
| key | text PK |
| user_id | FK nullable |
| request_path | text |
| response_code | int |
| response_body | jsonb nullable |
| created_at / expires_at | |

Used for HTTP-level money POST dedupe in addition to row-level keys.

---

### 4.3 Trading & daily returns

#### `trading_days`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| date | date unique (platform TZ calendar day) |
| status | `trading_day_status` |
| computed_return_pct | decimal nullable |
| applied_return_pct | decimal nullable |
| override_reason | text nullable |
| published_at / published_by_id | |
| timestamps | |

**Indexes:** unique `date`; `(status, date DESC)`

#### `trades`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| trading_day_id | FK → trading_days |
| pair | varchar |
| direction | `trade_direction` |
| entry_price / exit_price | decimal |
| stop_loss / take_profit / lot_size / pips | nullable decimals/text |
| return_pct | signed decimal |
| outcome | `trade_outcome` |
| source | `trade_source` |
| notes | text |
| image_key | text nullable |
| publish_status | `publish_status` |
| is_public | boolean (derived from publish or explicit) |
| published_at / scheduled_at | |
| risk_label | text nullable |
| created_by_id | FK users |
| deleted_at | soft delete for drafts |
| timestamps | |

**Indexes:** `(trading_day_id)`; `(publish_status, published_at DESC)`; `(pair, created_at)`; `(is_public)` partial true  
**FK:** trading_day ON DELETE RESTRICT

#### `daily_return_runs`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| trading_day_id | **unique** FK → trading_days |
| status | `daily_return_run_status` |
| return_pct | decimal |
| return_basis | `return_basis` |
| eligible_user_count / processed_user_count | int |
| total_base_amount / total_distributed / rounding_delta | decimal |
| started_at / completed_at | |
| created_by_id | FK users |
| failure_reason | text |
| idempotency_key | unique |
| timestamps | |

**Constraints:** one run row per trading day; process is idempotent

#### `profit_distributions`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| run_id | FK → daily_return_runs |
| user_id / wallet_id | FKs |
| eligible_balance / gross_amount / amount | decimal |
| ledger_entry_id | unique FK → ledger_entries nullable until posted |
| is_reversed | boolean default false |
| timestamps | |

**Constraints:** unique `(run_id, user_id)`  
**Indexes:** `(user_id, created_at DESC)`; `(run_id)`

---

### 4.4 Documents (KYC / proofs)

#### `documents`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| user_id | FK → users |
| type | `document_type` |
| storage_key | text |
| mime / size_bytes | |
| status | `document_status` |
| reviewed_by_id / reviewed_at / rejection_reason | |
| deposit_id | FK deposits nullable (payment proofs) |
| deleted_at | soft delete |
| timestamps | |

**Indexes:** `(user_id, type, created_at DESC)`; `(status, created_at)`; `(deposit_id)`

---

### 4.5 Notifications & email

#### `notifications`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| user_id | FK → users |
| type | `notification_type` |
| title / body | text |
| action_url | text nullable |
| data | jsonb nullable |
| read_at / archived_at | soft archive |
| created_at | |

**Indexes:** `(user_id, created_at DESC)`; partial unread `(user_id)` where `read_at IS NULL`

#### `notification_preferences`

| Column | Notes |
|--------|-------|
| id | UUID PK or composite |
| user_id | FK |
| channel | `notification_channel` |
| notification_type | `notification_type` or category |
| enabled | boolean |

**Constraints:** unique `(user_id, channel, notification_type)`

#### `notification_campaigns`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| title / body | |
| audience | `campaign_audience` |
| audience_detail | jsonb |
| channels | jsonb array |
| status | `campaign_status` |
| created_by_id | FK |
| sent_at | |
| deleted_at | soft |
| timestamps | |

#### `email_templates`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| key | text unique (e.g. `welcome`, `kyc_approved`) |
| name | text |
| subject | text |
| body_html | text |
| updated_by_id | FK nullable |
| timestamps | |

#### `email_logs`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| user_id | FK nullable |
| to_email | citext |
| template_key | text |
| subject | text |
| status | `email_log_status` |
| provider_message_id | text |
| error | text |
| meta | jsonb |
| created_at / sent_at | |

**Indexes:** `(to_email, created_at DESC)`; `(template_key, created_at)`; `(status, created_at)`

---

### 4.6 Support

#### `support_tickets`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| user_id | FK → users |
| subject | varchar |
| category | `support_category` |
| priority | `support_priority` |
| status | `support_status` |
| assignee_id | FK users nullable |
| closed_at | |
| deleted_at | soft (hide from queues; retain) |
| timestamps | |

**Indexes:** `(user_id, status)`; `(status, priority, created_at)`; `(assignee_id, status)`

#### `support_messages`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| ticket_id | FK → support_tickets |
| author_id | FK → users |
| body | text |
| is_internal | boolean (staff notes) |
| created_at | append-oriented |

**Indexes:** `(ticket_id, created_at)`

#### `support_attachments`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| message_id | FK → support_messages |
| storage_key / mime / size_bytes | |
| created_at | |

---

### 4.7 Referrals (v1.1-ready)

#### `referral_attributions`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| referrer_id | FK → users |
| referee_id | unique FK → users |
| code_used | text |
| rewarded_at | nullable |
| created_at | |

**Indexes:** `(referrer_id)`; unique `referee_id`

---

### 4.8 Platform settings & governance

#### `settings`

| Column | Notes |
|--------|-------|
| key | text PK |
| value | jsonb |
| updated_by_id | FK nullable |
| updated_at | |

Examples: min/max deposit & withdrawal, return basis, cooldown hours, maintenance mode, timezone, analytics IDs (if not solely in CMS SEO).

#### `feature_toggles`

| Column | Notes |
|--------|-------|
| key | text PK |
| enabled | boolean |
| description | text |
| updated_by_id / updated_at | |

Examples: registration, login, deposit, withdrawal, returns, referral, support, trading, maintenance.

#### `audit_logs` (immutable)

| Column | Notes |
|--------|-------|
| id | UUID PK |
| actor_id | FK users nullable (system) |
| action | text |
| entity_type | text |
| entity_id | UUID nullable |
| before / after | jsonb |
| ip | inet |
| user_agent | text |
| request_id | text |
| created_at | only |

**Indexes:** `(actor_id, created_at DESC)`; `(entity_type, entity_id)`; `(created_at DESC)`; `(action, created_at DESC)`  
**Policy:** INSERT only — no update/delete

#### `outbox_events`

Reliable async side effects (email, push, webhooks).

| Column | Notes |
|--------|-------|
| id | UUID PK |
| topic | text |
| payload | jsonb |
| status | queued/processing/done/failed |
| attempts | int |
| available_at / processed_at | |
| last_error | text |
| created_at | |

**Indexes:** `(status, available_at)` for workers

#### `user_admin_notes` (optional)

| Column | Notes |
|--------|-------|
| id | UUID PK |
| user_id | FK |
| author_id | FK |
| body | text |
| created_at | |

---

### 4.9 CMS tables

CMS separates **editable working state** from **published snapshots** where needed for zero-downtime publish.

#### `cms_landing_draft` / `cms_landing_published`

Singleton-style rows (or versioned documents).

| Logical fields | Notes |
|----------------|-------|
| company_name, logo_key/url | Brand |
| hero_title, hero_subtitle, CTAs, banner_key | Hero |
| avg_monthly_return, win_rate, aum, best_day, investor_count, countries | Stats |
| footer_tagline, risk_disclosure, support_email, social jsonb | Footer |
| homepage_popup jsonb, announcements_banner | Promo |
| hero_motion jsonb | Particles/glow/intensity |
| status | `publish_status` |
| published_at / updated_by_id | |
| timestamps | |

**Publish flow:** copy draft → published row + write `cms_revisions`.

#### `cms_pages`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| slug | unique (about, terms, privacy, contact, footer, faq page shell) |
| title | text |
| body | text |
| status | `publish_status` |
| deleted_at | soft |
| timestamps | |

#### `cms_faqs`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| question / answer | text |
| sort_order | int |
| is_published | boolean |
| deleted_at | soft |
| timestamps | |

**Indexes:** `(is_published, sort_order)`

#### `cms_testimonials`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| name, country, quote | |
| rating | smallint 1–5 |
| platform | text |
| photo_key | text |
| published_at | |
| is_enabled | boolean |
| deleted_at | soft |
| timestamps | |

#### `cms_ticker_pairs`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| pair | varchar |
| price / change_pct | text or decimal |
| tone | auto/up/down |
| is_enabled / is_featured | boolean |
| sort_order | int |
| deleted_at | soft |
| timestamps | |

**Indexes:** `(is_enabled, sort_order)`

#### `cms_ticker_display` (singleton)

| Column | Notes |
|--------|-------|
| enabled | boolean |
| scroll_speed / refresh_ms | int |
| direction | left/right |
| up_color / down_color | text |

#### `cms_performance_snapshots`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| status | draft/published |
| daily/weekly/monthly/yearly returns | text/decimal fields |
| best_day / worst_day / winning_pct | |
| monthly jsonb | `[{month, returnPct}]` |
| yearly jsonb | `[{year, returnPct, profitLabel}]` |
| published_at | |
| timestamps | |

Alternatively split `cms_performance_monthly` / `_yearly` child tables if querying by month becomes heavy.

#### `cms_announcements`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| type | `announcement_type` |
| title / body | |
| color | text |
| priority | `announcement_priority` |
| display_page | `display_page` |
| sticky / popup | boolean |
| status | `publish_status` |
| scheduled_at / expires_at / published_at | |
| deleted_at | soft |
| timestamps | |

**Indexes:** `(status, priority)`; `(display_page, status)`; `(expires_at)`

#### `cms_activity_config` (singleton)

| Column | Notes |
|--------|-------|
| enabled | boolean |
| names / countries | jsonb arrays |
| deposit/withdrawal min/max | numeric |
| delay_ms / animation_speed | |
| seed_items | jsonb |

#### `cms_media_assets`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| name | text |
| kind | `media_kind` |
| mime / size_bytes / storage_key / url | |
| deleted_at | soft |
| timestamps | |

**Indexes:** `(kind, created_at DESC)`; `(name)`

#### `cms_report_docs`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| title | text |
| type | `report_doc_type` |
| period_label | text |
| file_name / storage_key / url | |
| status | draft/published |
| published_at | |
| download_count | int |
| deleted_at | soft |
| timestamps | |

**Indexes:** `(status, published_at DESC)`; `(type)`

#### `cms_site_seo` (singleton)

| Column | Notes |
|--------|-------|
| website_name, logo_key, favicon_key | |
| meta_title, meta_description | |
| google_analytics_id, facebook_pixel_id | |
| maintenance_mode, maintenance_message | |
| support_hours, support_phone, support_email | |
| updated_at / updated_by_id | |

#### `cms_revisions`

| Column | Notes |
|--------|-------|
| id | UUID PK |
| module | `cms_module` |
| label | text |
| snapshot | jsonb |
| admin_id | FK users |
| created_at | |

**Indexes:** `(module, created_at DESC)`

---

## 5. Relationships (summary)

| Parent | Child | Cardinality | On delete |
|--------|-------|-------------|-----------|
| users | wallets | 1∶1 (v1) | RESTRICT |
| wallets | ledger_entries | 1∶n | RESTRICT |
| users | deposits / withdrawals | 1∶n | RESTRICT |
| payment_methods | deposits | 1∶n | RESTRICT |
| users | payout_methods | 1∶n | RESTRICT |
| payout_methods | withdrawals | 1∶n | SET NULL |
| trading_days | trades | 1∶n | RESTRICT |
| trading_days | daily_return_runs | 1∶1 | RESTRICT |
| daily_return_runs | profit_distributions | 1∶n | CASCADE (run delete rare) |
| profit_distributions | ledger_entries | 0‥1∶1 | SET NULL / RESTRICT once posted |
| users | documents / notifications / tickets | 1∶n | RESTRICT |
| support_tickets | support_messages | 1∶n | CASCADE |
| support_messages | support_attachments | 1∶n | CASCADE |
| users | admin_role_assignments | 1∶n | CASCADE |
| users | audit_logs (as actor) | 1∶n | SET NULL |
| CMS parents | cms_revisions | logical | — |

Polymorphic money references use `(reference_type, reference_id)` on `ledger_entries` rather than multiple nullable FKs.

---

## 6. Indexes (strategy)

| Pattern | Applied to |
|---------|------------|
| Primary key UUID | All tables |
| Unique natural keys | email, referral_code, trading_day.date, template key, idempotency keys |
| Queue indexes | `(status, created_at)` on deposits, withdrawals, KYC docs, tickets, return runs |
| User timelines | `(user_id, created_at DESC)` on ledger, deposits, withdrawals, notifications, distributions |
| Partial indexes | Unread notifications; active payment methods; published trades; non-deleted soft rows |
| Audit search | `(created_at DESC)`, `(actor_id, created_at)`, `(entity_type, entity_id)` |
| CMS public reads | published flags + sort_order; announcement expiry |

Avoid over-indexing write-heavy ledger beyond wallet/user/time and reference lookups.

---

## 7. Foreign keys & referential integrity

- Money-bearing parents (**users**, **wallets**, **trading_days**, **payment_methods**) use **ON DELETE RESTRICT**.
- Soft-deleted child convenience FKs (payout method on withdrawal) use **ON DELETE SET NULL** with **destination_snapshot** preserving history.
- Session/token tables may **CASCADE** on user hard-delete (hard-delete only for accounts with zero ledger — operationally rare).
- Posted `ledger_entry_id` on distributions is **RESTRICT** once set.
- Prefer application-level guards before relying on cascade for financial graphs.

---

## 8. Constraints (checklist)

### Money integrity

- Wallet: `balance ≥ 0`, `locked_balance ≥ 0`, `locked_balance ≤ balance`
- Deposit/withdrawal amounts `> 0`
- Withdrawal: `net_amount = amount − fee_amount`
- Ledger: `balance_after = balance_before + amount`
- Ledger: unique `idempotency_key`
- Unique `(daily_return_runs.trading_day_id)`
- Unique `(profit_distributions.run_id, user_id)`
- Unique `(wallets.user_id, kind)`

### Identity

- Unique email among active users
- Unique referral_code when present
- Unique OAuth `(provider, provider_user_id)`

### Content

- Unique `cms_pages.slug`
- Unique `email_templates.key`
- Testimonial rating between 1 and 5
- Announcement expiry after schedule when both set (app-level)

### Immutability

- No UPDATE/DELETE on `ledger_entries` and `audit_logs` (DB roles / triggers)
- Compensating entries for reversals (`PROFIT_REVERSAL`, withdrawal refunds)

---

## 9. Soft deletes

| Entity class | Mechanism | Hard delete? |
|--------------|-----------|--------------|
| Users | `status = CLOSED` (+ optional `deleted_at`) | Never if ledger exists |
| Payout methods, payment methods | `deleted_at` | Rare purge only if unused |
| CMS lists (FAQ, testimonials, media, reports, announcements) | `deleted_at` or `ARCHIVED` status | Optional purge of drafts |
| Support tickets | `deleted_at` or `CLOSED` | Retain for compliance |
| Notifications | `archived_at` | TTL job may purge old read rows |
| Trades | `deleted_at` for unpublished drafts | Published trades retained |
| Sessions | `revoked_at` | TTL cleanup |
| Role assignments | `revoked_at` | Keep history |

**Rule:** Soft delete never removes ledger, audit, email logs, or paid withdrawal history.

---

## 10. Audit strategy

### What gets audited

Every admin (and sensitive user) mutation, including:

- KYC approve/reject  
- Deposit/withdrawal decisions  
- Wallet adjustments / freezes  
- Daily return process / reverse  
- Trade publish  
- CMS publish (landing, performance, reports, announcements)  
- Settings / feature toggles / payment rails  
- Role grants / staff invites  
- Email template updates  
- Support internal notes (optional; at least ticket status changes)

### Audit row contents

- Who (`actor_id`)  
- What (`action`, `entity_type`, `entity_id`)  
- Before / after JSON snapshots (redact secrets: password hashes, 2FA secrets, full payout details)  
- Where (`ip`, `user_agent`)  
- Correlation (`request_id`)  
- When (`created_at`)

### Storage & retention

- Append-only table; separate tablespace/partition by month when volume grows  
- Retain ≥ regulatory minimum (configurable); cold storage export thereafter  
- CMS `cms_revisions` complements audit with full content snapshots for rollback UX  
- Outbox + email logs provide delivery forensics separate from audit

### Application pattern

1. Begin DB transaction  
2. Apply domain mutation + ledger posts  
3. Insert audit row in same transaction  
4. Enqueue outbox event for email/push  
5. Commit  

Failed audits must fail the business transaction for money and publish operations.

---

## 11. Future scalability

### Data growth

| Area | Strategy |
|------|----------|
| `ledger_entries` | Partition by `created_at` (monthly/quarterly); BRIN optional |
| `audit_logs` / `email_logs` | Time partitioning; archive to object storage |
| `notifications` | TTL + archive; partial indexes for unread |
| CMS media/reports | Object storage; DB holds metadata only |
| Analytics visitors | Prefer external warehouse; don’t overload OLTP |

### Throughput

- Optimistic locking on `wallets.version` for concurrent posts  
- Idempotent return processor (chunk users; resume from `processed_user_count`)  
- Read replicas for public CMS bootstrap and trade history lists  
- Materialized view `v_user_transactions` if ledger joins become heavy  
- Cache published CMS bootstrap in Redis with pub/sub invalidate on publish  

### Multi-currency / multi-wallet

- Keep `currency` and `wallet.kind` now  
- Future: one wallet per `(user, kind, currency)` without splitting ledger semantics  
- FX conversion as explicit ledger pairs (not silent mutation)

### Multi-region

- Single primary writer for money  
- Read-local CMS/CDN for marketing assets  
- UUID keys avoid cross-region sequence contention  

### Product expansion

- Referrals rewards → ledger `BONUS` + attribution table (already sketched)  
- Multiple programmes → `programme_id` on trading days / wallets later  
- MT5 import → `trade_source` already enumerated  

### Operational

- `outbox_events` for emails/webhooks beats dual-write races  
- Feature toggles + `cms_site_seo.maintenance_mode` for safe degrades  
- Backup: continuous PG backup + object-store versioning; CMS JSON export is convenience only  

---

## 12. Mapping to current frontend demo stores

| Demo store | Primary tables |
|------------|----------------|
| `growzy_investor_lifecycle_v2` | users, wallets, ledger, deposits, withdrawals, documents, email_logs |
| `growzy_admin_os_v3` | cms_*, trades, trading_days, payment_methods, email_templates, announcements, settings, audit_logs, support_* |
| `growzy_notifications_v2` | notifications |
| Session cookies | sessions / refresh_tokens |

Shared DTO contracts live in `@meridian/shared` (`entities.ts`, enums). Prisma models in `apps/api` should follow this document.

---

## 13. Related documents

| Document | Role |
|----------|------|
| `BACKEND_REQUIREMENTS.md` | APIs and flows that use these tables |
| `SYSTEM_ARCHITECTURE.md` | System context |
| `docs/04-database-schema.md` | Earlier Meridian-era notes |
| `docs/12-trading-engine.md` | Return engine behaviour |
| `CMS_COMPLETION_REPORT.md` | CMS field surface area |

---

## 14. Implementation note

This file is **architecture only**. Physical DDL, migrations, and Prisma models are intentionally out of scope here and should be generated in a later backend phase to match these entities, enums, constraints, and index strategies exactly.
