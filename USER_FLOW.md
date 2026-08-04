# Growzy — User Flow

Investor journeys from first visit through logout. Aligns with `docs/06-user-flow.md` (Growzy brand).

---

## Master journey

```
Visitor → Register → Email Verification → Login → Dashboard
    → Deposit → Admin Approval → Eligible for Trading Days
    → Daily Profit/Loss Applied → Withdraw → Logout
```

---

## 1. Visitor (unauthenticated)

| Step | Surface | Behaviour |
|------|---------|-----------|
| Land | `/` | Hero, performance proof, tickers, testimonials, map, FAQ, risk |
| Explore | `/performance`, `/our-trading-system`, `/transparency`, `/security` | Public published history only |
| Decide | CTAs | Register / Contact / View performance |
| Legal | `/legal/*` | Terms, privacy, risk, refund |

**Rules:** No personal balances. Public APIs only (`/performance/public`, published trades).

---

## 2. Register

| Step | Detail |
|------|--------|
| Route | `/register` |
| Input | Name, email, phone, country, password, confirm, terms, optional referral |
| API | `POST /auth/register` |
| Result | User `PENDING_VERIFICATION`, wallet created with zeros, verification email queued |
| UX | Success → “check your email” (`/verify-email/sent`) |

**Security:** Enumeration-safe responses (see `SECURITY_PLAN.md`). Password argon2id server-side.

---

## 3. Email verification

| Step | Detail |
|------|--------|
| Link | Tokenised URL → `/verify-email?token=` |
| API | `POST /auth/verify-email` |
| Result | `emailVerifiedAt` set; status → `ACTIVE` |
| Failure | Expired/invalid → resend flow |

Unverified users may log in but cannot deposit/withdraw (`EMAIL_NOT_VERIFIED`).

---

## 4. Login

| Step | Detail |
|------|--------|
| Route | `/login` |
| API | `POST /auth/login` |
| Result | `gz_at` + `gz_rt` cookies; redirect `next` or `/dashboard` |
| Failures | Bad credentials, suspended, rate limit |

Optional: Google OAuth PKCE → same session cookies.

---

## 5. Dashboard

| Widget | Source |
|--------|--------|
| Available / locked / invested / total profit | `GET /wallet/summary` |
| Equity chart | `GET /performance/me` |
| Recent trades | published trades feed |
| Recent ledger | wallet ledger |
| Notifications badge | unread count |
| Quick actions | Deposit, Withdraw, Performance, Settings |

**Rule:** Frontend never invents balances — render API only.

---

## 6. Deposit

```
Select method → Enter amount → Create PENDING deposit
→ Pay externally → Upload proof → UNDER_REVIEW
→ Admin APPROVE → Ledger credit → Notification + email
→ Earn from NEXT trading day
```

| Guard | Rule |
|-------|------|
| Min amount | Setting (default $50) |
| Proof | Required before review completes |
| Cancel | Allowed while PENDING |
| Reject | No balance change; reason shown |

---

## 7. Approval (user-visible)

User watches status on Deposit detail / history. Toasts/emails on approve/reject. Dashboard balances update only after approve.

---

## 8. Trading (user experience)

Users do **not** place trades. Desk publishes:

1. Trades for day D  
2. Trading day published  
3. Daily return applied  

User sees:

- Published trade tickets  
- Daily profit/loss notification  
- Ledger `PROFIT_DISTRIBUTION`  
- Updated wallet  

---

## 9. Profit / loss

| Day type | UX |
|----------|-----|
| Positive | Green figures; email “Daily profit” |
| Negative | Same prominence; email “Daily loss”; balance never < 0 after clamp |

Email includes: return %, base used, amount, new balance, link to day trades.

---

## 10. Withdraw

```
Choose payout method → Amount → Validate available + cooldown
→ LOCK funds immediately → PENDING review
→ Admin approve → COMPLETED debit → Mark paid (ops)
→ Or reject/cancel → UNLOCK (refund ledger)
```

| Guard | Rule |
|-------|------|
| Available | `balance - locked` |
| Min | Setting (default $20) |
| Cooldown | Hours after last approved deposit |
| Destination | Snapshot frozen at request time |

---

## 11. Settings & support

- Profile, password, notification prefs, payout methods  
- Support tickets (contact form also hits ops)  
- Referrals if feature flag on  

---

## 12. Logout

`POST /auth/logout` → revoke refresh → clear cookies → `/login`.

---

## Edge cases

| Case | Behaviour |
|------|-----------|
| Suspended mid-session | Next API call 403; force logout UX |
| Maintenance mode | 503 MAINTENANCE_MODE; marketing still up |
| Concurrent withdraw + daily return | Wallet row locked (`FOR UPDATE`); locked funds still eligible for return per policy |
| Double-submit deposit | Idempotency-Key returns same resource |
