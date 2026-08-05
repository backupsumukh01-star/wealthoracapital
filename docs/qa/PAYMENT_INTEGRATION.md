# Production Payment Integration

**Date:** 2026-08-05  
**Webhook:** `POST /api/v1/webhooks/payments`  
**Admin:** reconciliation + webhook inbox under `/api/v1/admin/finance/*`

---

## Architecture

```
Investor creates deposit/withdrawal
        │
        ▼
Approval queue (FINANCE)
        │
   ┌────┴────┐
   │ Manual  │  Provider webhook
   │ review  │  (HMAC verified)
   └────┬────┘
        ▼
Ledger post (idempotent keys)
        │
        ▼
Reconciliation job (wallet ↔ ledger ↔ webhooks)
```

Existing admin approval paths remain the source of truth for withdrawals (`APPROVE` then `PAID` / provider `withdrawal.paid`). Deposits can auto-confirm via webhook when `PAYMENT_AUTO_CONFIRM_DEPOSITS=true`, otherwise provider confirmation moves the deposit to `UNDER_REVIEW` for finance approval.

---

## Environment

| Variable | Purpose |
|----------|---------|
| `PAYMENT_PROVIDER` | `generic` \| `nowpayments` (label stored on events) |
| `PAYMENT_WEBHOOK_SECRET` | HMAC-SHA256 secret (required in production) |
| `PAYMENT_AUTO_CONFIRM_DEPOSITS` | `true` → webhook credits ledger; `false` → queue for admin |
| `PAYMENT_WEBHOOK_MAX_SKEW_SECONDS` | Reject stale `occurredAt` (default 300; `0` disables) |

---

## Webhook contract

**URL:** `POST /api/v1/webhooks/payments`  
**Auth:** HMAC of **raw JSON body** (required unless `PAYMENT_WEBHOOK_ALLOW_UNSIGNED=true`, which is **forbidden in production**).

Headers (any one):

- `X-Growzy-Signature: sha256=<hex>`
- `X-Payment-Signature: sha256=<hex>`
- `X-Nowpayments-Sig: <hex>`

### Payload

```json
{
  "eventId": "evt_01HXYZ",
  "eventType": "deposit.confirmed",
  "reference": "DEP-AB12CD34EF",
  "amount": "250.00",
  "currency": "USD",
  "txHash": "0xabc…",
  "occurredAt": "2026-08-05T20:00:00.000Z"
}
```

| `eventType` | Effect |
|-------------|--------|
| `deposit.confirmed` | Auto-approve + ledger credit **or** `UNDER_REVIEW` for admin |
| `deposit.failed` | Reject pending deposit; unlock pending amount |
| `withdrawal.paid` | Complete ledger **only if** status is `APPROVED` / `PROCESSING` |
| `withdrawal.failed` | Reject + unlock locked funds |

### Duplicate protection

Table `payment_webhook_events` has unique `(provider, eventId)`. Replays return `200` with `{ duplicate: true }` and do **not** re-credit the ledger.

Ledger posts use stable idempotency keys:

- Deposit credit: `deposit:{id}:approve`
- Withdrawal lock / unlock / complete: `withdrawal:{id}:lock|unlock|complete`

---

## Deposit confirmation flow

1. Investor `POST /deposits` → `PENDING` + approval queue + pending balance bump  
2. Provider sends `deposit.confirmed`  
3. If `PAYMENT_AUTO_CONFIRM_DEPOSITS=true` → `confirmFromProvider` → `APPROVED` + double-entry credit  
4. Else → `UNDER_REVIEW` + `FinanceReview(PROVIDER_CONFIRM)` → admin `POST /admin/deposits/:id/review` `{ decision: "APPROVE" }`

## Withdrawal workflow

1. Investor creates withdrawal → funds **locked** on ledger  
2. Admin `APPROVE` (required before provider settlement)  
3. Ops marks `PAID` **or** provider sends `withdrawal.paid`  
4. `completeWithdrawal` posts locked → payout (idempotent)  
5. `withdrawal.failed` unlocks funds and rejects

## Admin approval

| Action | Endpoint | Permission |
|--------|----------|------------|
| Review deposit | `POST /admin/deposits/:id/review` | `finance.review` |
| Approve / reject shortcuts | `/approve`, `/reject` | `finance.review` |
| Review withdrawal | `POST /admin/withdrawals/:id/review` | `finance.review` |
| Mark paid | `POST /admin/withdrawals/:id/mark-paid` | `finance.review` |

## Transaction reconciliation

| Endpoint | Permission |
|----------|------------|
| `POST /admin/finance/reconciliation/run` | `finance.manage` |
| `GET /admin/finance/reconciliation` | `finance.view` |
| `GET /admin/finance/webhooks` | `finance.view` |
| `POST /admin/wallets/:id/sync-ledger` | `finance.adjust` |

Checks:

- Approved deposits without ledger credit  
- Paid withdrawals without completion entry  
- Wallet balance vs sum of ledger `signedAmount` (drift)  
- Stale approval queue (>7 days)  
- Failed webhooks  
- Provider-confirmed deposits still awaiting admin  

`sync-ledger` rewrites denormalized wallet `balance` / `availableBalance` from ledger truth (does not invent money).

---

## Security notes

- Webhooks skip CSRF (no session cookies); signature is mandatory when secret is set.  
- In production, missing `PAYMENT_WEBHOOK_SECRET` rejects all webhook posts.  
- Amount credited never exceeds the original deposit amount.  
- Concurrent approve/confirm uses `SELECT … FOR UPDATE` + conditional `updateMany`.

---

## Local test (unsigned, non-production)

```bash
curl -s -X POST http://localhost:4000/api/v1/webhooks/payments \
  -H 'Content-Type: application/json' \
  -d '{"eventId":"evt_test_1","eventType":"deposit.confirmed","reference":"DEP-XXXX","amount":"100.00"}'
```

With secret:

```bash
BODY='{"eventId":"evt_test_2","eventType":"deposit.confirmed","reference":"DEP-XXXX","amount":"100.00"}'
SIG=$(node -e "console.log(require('crypto').createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET).update(process.argv[1]).digest('hex'))" "$BODY")
curl -s -X POST http://localhost:4000/api/v1/webhooks/payments \
  -H 'Content-Type: application/json' \
  -H "X-Growzy-Signature: sha256=$SIG" \
  -d "$BODY"
```
