# APPLICATION_FLOW_CHECKLIST.md

Growzy Capital — frontend mock integration QA  
Generated: 2026-08-03  
Scope: UI + shared mock store only (no backend / DB / APIs)

---

## Frontend completion status

| Area | Status | Notes |
|------|--------|-------|
| Landing / marketing | Complete (frozen) | Not redesigned |
| Investor auth + KYC onboarding | Complete | Lifecycle store |
| Investor dashboard states | Complete | `AccountStatusBanner` + KYC/deposit gates |
| Wallet deposit / withdraw | Complete | Writes to shared store |
| Admin portal | Complete | Actions mutate shared store |
| Shared mock state | Complete | `InvestorLifecycleProvider` v2 (wallet, deposits, withdrawals, returns, emails) |
| Notifications | Complete | Push via `growzy:notify` + mark read / archive |
| Email preview | Complete | `/settings/emails` + admin email center outbox |
| Backend | Not started | Architecture ready |

**Overall frontend (mock product): ~95%** for end-to-end journeys. Remaining polish: every secondary marketing CTA optional, support tickets still demo-local.

---

## Completed flows

### Investor
1. Register → auto User ID / username → Welcome + Verify emails queued  
2. Email OTP (`123456`) → auto session → onboarding welcome  
3. KYC submit → Under Review → deposit locked  
4. Admin KYC approve → Verified badge → Deposit unlocked  
5. Deposit submit → pending timeline → admin approve → wallet balance ↑ + email + notification  
6. Daily return publish (admin) → wallet profit ↑ + notification  
7. Withdrawal submit → balance reserved → admin approve / mark paid → wallet ↓  
8. Notifications: unread / read / mark all / archive  
9. Email preview templates (Welcome, Verify, KYC, Deposit, Withdrawal, Daily Return, Password Reset, Login Alert)  
10. Forgot password / change password / 2FA (demo OTP)  

### Admin
1. Separate login + 2FA → ops shell  
2. Overview KPIs + queues  
3. Users table (lifecycle accounts) + profile tabs  
4. KYC queue / review → `approveKyc` / `rejectKyc` / resubmit  
5. Deposits / withdrawals → approve / reject / need info / mark paid  
6. Publish daily return → credits verified wallets  
7. Email center outbox reads lifecycle emails  
8. Reports / audit / settings (UI mock)  

### Cross-connection (shared mock)
- Admin KYC approve → investor `canDeposit` true  
- Admin deposit approve → investor wallet + notification  
- Admin return publish → investor profit + notification  
- Investor deposit/withdraw → appears in admin queues  

---

## Missing / partial flows

| Flow | Gap |
|------|-----|
| Support tickets | UI exists; not written into shared store |
| Trade history investor list | Still largely static demo trades |
| Admin broadcast → investor inbox | Compose toasts; wire optional to `pushNotification` for selected users |
| Change email full dual-OTP UX | Store method exists; profile form still mostly demo |
| Session timeout UI | Not enforced in demo |
| Google OAuth | Demo stub account only |
| Reconciliation / ledger export | Admin reports generate toast downloads only |

---

## Broken navigation (checked)

| Check | Result |
|-------|--------|
| Landing Start Investing / Login → auth modal | OK |
| Auth → verify → onboarding → dashboard | OK |
| Dashboard Deposit when KYC incomplete → status next action | OK |
| Wallet `?action=deposit` gated | OK |
| Admin `/admin` without session → `/admin/login` | OK |
| Settings → Email preview | OK (`/settings/emails`) |
| Dead admin `Placeholder` pages | Replaced earlier with workspaces |

No intentional dead-end primary CTAs on investor home / wallet / KYC / admin money queues.

---

## Future backend APIs needed

Map 1:1 to existing client methods / routes:

### Auth
- `POST /auth/register`, `POST /auth/login`, `POST /auth/verify-email`, `POST /auth/forgot-password`, `POST /auth/reset-password`
- `POST /auth/google`, sessions, refresh, logout-all
- `POST /auth/2fa/enable|disable|verify`

### KYC
- `POST /kyc/submit` (multipart)
- `GET /admin/kyc`, `POST /admin/kyc/:userId/approve|reject|resubmit`

### Wallet
- `GET /wallet`
- `POST /deposits`, `GET /deposits`
- `POST /admin/deposits/:id/approve|reject|need-info`
- `POST /withdrawals`, `GET /withdrawals`
- `POST /admin/withdrawals/:id/approve|reject|mark-paid`

### Returns / trades
- `POST /admin/daily-return/preview`, `POST /admin/daily-return/apply`
- `POST /admin/trades`, `GET /trades`

### Comms
- Notification feed + mark read / archive
- Email provider outbox (templates already named in lifecycle)

### Admin
- Users search, suspend/activate, notes, reports export, audit log, settings

Swap: `loadLifecycleStore` / `saveLifecycleStore` → HTTP; keep UI contracts.

---

## Manual QA walkthrough (demo)

**Investor seed:** `investor@growzy.com` / `Growzy2026!` (verified, funded)  
**Admin:** `admin@growzy.com` / `GrowzyAdmin2026!` / OTP `123456`  
**OTP everywhere:** `123456`

1. Clear site data → register new user → verify → KYC → confirm wallet Deposit disabled  
2. Admin login → KYC queue → Approve → investor refresh → Deposit enabled  
3. Investor deposit → admin approve → balance increases  
4. Admin publish return → investor profit updates + notification  
5. Investor withdraw → admin mark paid → pending clears  

---

## Design constraints honored

- No landing redesign  
- No investor dashboard layout/color redesign  
- Existing Growzy glass / tokens reused  
- Mock-only shared state prepared for API swap  
