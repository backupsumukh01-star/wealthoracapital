# Growzy — Database Requirements

**Engine:** PostgreSQL 16  
**ORM:** Prisma (`apps/api`)  
**Detail:** See `DATABASE_SCHEMA.md` (logical schema, no DDL here)

---

## 1. Must-have domains

| Domain | Purpose |
|--------|---------|
| Identity | Users, sessions, OTP, staff roles, permissions |
| KYC | Submissions, documents, review history |
| Money | Wallets, ledger_entries, deposits, withdrawals |
| Trading | Trades, trading_days, daily_return_runs, distributions |
| Comms | Notifications, email_templates, email_outbox, campaigns |
| Support | Tickets, messages |
| CMS | Landing, pages, FAQ, testimonials, announcements, ticker, platform CMS, revisions, media, reports, site_settings |
| Governance | Audit events, feature_flags, backup_jobs |
| Ops | Optional health_snapshots, login_attempts |

---

## 2. Non-negotiable rules

1. Ledger is append-only; wallet balances are caches.  
2. Idempotency keys on deposit approve, withdraw payout, return distribute.  
3. Money columns `DECIMAL` — never float.  
4. Soft-close users; never hard-delete financial history.  
5. CMS draft vs published separation + revision rows.  
6. Audit every privileged admin mutation (IP, UA, old/new, reason).

---

## 3. Alignment with frontend services

| Service | Primary tables |
|---------|----------------|
| `authService` | users, sessions, otp |
| `walletService` | wallets, ledger_entries |
| `depositService` | deposits, payment_methods |
| `withdrawService` | withdrawals, payout_methods |
| `tradeService` | trades |
| `reportService` | daily_return_runs, distributions, equity materializations |
| `notificationService` | notifications |
| `kycService` | kyc_* |
| `supportService` | tickets |
| `cmsService` / `adminService` | cms_*, media, audit, flags, backups |

---

## 4. Seed for go-live

- Super Admin staff user  
- Default feature flags  
- CMS bootstrap (from Admin Backup Center JSON export)  
- Payment methods  
- Email templates  

---

## 5. Backups

Match Backup Center UI: scheduled dumps, restore points metadata in `backup_jobs`, encrypted offsite copies.
