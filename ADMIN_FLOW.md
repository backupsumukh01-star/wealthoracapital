# Growzy — Admin Flow

Operator journeys for staff (`ADMIN` / `SUPER_ADMIN`). Aligns with `docs/07-admin-flow.md`.

---

## Master journey

```
Admin Login (+ 2FA) → Dashboard Overview
  → Approve Deposits → Approve Withdrawals
  → Publish Trade History → Publish / Apply Daily Return
  → Send Notifications / Broadcasts
  → Generate Reports → Manage Users
```

---

## 1. Admin login

| Step | Detail |
|------|--------|
| Entry | `/admin` or `/login` then role gate |
| Auth | Same cookie session; `role` must be ADMIN or SUPER_ADMIN |
| 2FA | Mandatory TOTP in v1 before money actions (enforce server-side) |
| Failure | Non-admin → 404 on admin UI; API 403/404 |

Invite-only provisioning — no public admin registration.

---

## 2. Dashboard overview

**API:** `GET /admin/overview`

KPIs (examples):

- Pending deposits / withdrawals counts  
- AUM (sum of balances)  
- Today’s published return (if any)  
- New users (24h)  
- Failed jobs / outbox dead letters  

Drill-downs link to queues below.

---

## 3. Approve deposits

```
Queue (PENDING/UNDER_REVIEW) → Open deposit → Verify proof
→ APPROVE (ledger credit) or REJECT (reason)
→ AuditLog + user notification/email
```

| Action | Role | Effect |
|--------|------|--------|
| Approve | 🛡 | `DEPOSIT_APPROVED` ledger; ↑ balance, invested, totalDeposited |
| Reject | 🛡 | Status only; no ledger |
| Mark under review | 🛡 | Optional intermediate |

**Idempotency:** Re-approve → CONFLICT.

---

## 4. Approve withdrawals

```
Queue → Verify destination snapshot + user risk
→ APPROVE (convert lock to completed debit)
→ Ops pays externally → MARK PAID (external ref)
→ Or REJECT (unlock refund)
```

| Action | Role | Ledger |
|--------|------|--------|
| Approve | 🛡 | `WITHDRAWAL_COMPLETED` (from prior LOCK) |
| Reject | 🛡 | `WITHDRAWAL_REFUNDED` |
| Mark paid | 🛡 | None (status + ref only) |

---

## 5. Publish trade history

```
Create/edit trades on TradingDay DRAFT
→ Review computed return %
→ Optional override + reason
→ PUBLISH day (visible on marketing/performance)
```

Distributed days: trades frozen (no edit without reverse — 👑).

---

## 6. Publish daily return (apply)

```
Ensure day PUBLISHED → PREVIEW (read-only math)
→ Type confirm phrase APPLY-YYYY-MM-DD
→ APPLY with Idempotency-Key
→ Run PROCESSING → COMPLETED
→ Outbox: notifications + emails
→ Day status DISTRIBUTED
```

See `DAILY_RETURN_ENGINE.md` for eligibility and formulas.

| Action | Role |
|--------|------|
| Preview / Apply | 🛡 |
| Reverse run | 👑 only |

---

## 7. Send notifications

| Mode | Path |
|------|------|
| System events | Automatic from domain (deposit approved, etc.) |
| Broadcast | Compose → segment → test → send |
| Announcement | In-app + optional email |

Marketing broadcasts must not bypass security-event preference locks.

---

## 8. Generate reports

| Report | Consumer |
|--------|----------|
| Deposits / withdrawals aggregates | Finance |
| Distribution totals by day | Ops |
| Audit export CSV | 👑 compliance |
| Monthly statements | Triggered job / on-demand |

---

## 9. Manage users

| Action | Role |
|--------|------|
| Search / view | 🛡 |
| Suspend / activate | 🛡 |
| Adjust balance | 👑 + reason + audit |
| Change role | 👑 |
| View devices/sessions | 🛡 |
| Force logout (revoke sessions) | 🛡 |

---

## 10. Platform settings (👑)

- Min deposit/withdraw, cooldown, max daily return %  
- Return basis (`BALANCE` vs `INVESTED`)  
- Maintenance mode  
- Payment methods CRUD  
- Staff invites  

Every change → AuditLog.

---

## 11. Daily operator checklist

1. Review pending deposits (SLA: desk hours)  
2. Review pending withdrawals  
3. Enter / import day’s trades  
4. Publish trading day  
5. Preview daily return → apply once  
6. Spot-check notifications/outbox  
7. Glance reconciliation alert  

---

## Permission matrix (summary)

| Capability | ADMIN | SUPER_ADMIN |
|------------|:-----:|:-----------:|
| Review deposits/withdrawals | ✓ | ✓ |
| Publish trades / apply return | ✓ | ✓ |
| Broadcast | ✓ | ✓ |
| View audit | ✓ | ✓ |
| Export audit | — | ✓ |
| Adjust balance / reverse return | — | ✓ |
| Settings / staff / payment methods | — | ✓ |
