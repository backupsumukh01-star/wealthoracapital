# API Documentation — Phase 4 (Financial Engine)

Base: `http://localhost:4000/api/v1`

Money amounts are **decimal strings** (never JSON numbers).

---

## Investor

| Method | Path | Permission |
|--------|------|------------|
| GET | `/wallet` | `wallet.view` |
| GET | `/wallet/summary` | `wallet.view` |
| GET | `/wallet/transactions` | `wallet.view` |
| GET | `/wallet/history` | `wallet.view` |
| GET | `/transactions` | `wallet.view` |
| GET | `/deposits/methods` | `deposits.view` |
| GET | `/deposits` | `deposits.view` |
| GET | `/deposits/:id` | `deposits.view` |
| POST | `/deposits` | `deposits.create` |
| POST | `/deposits/:id/proof` | `deposits.create` (multipart `file`) |
| POST | `/deposits/:id/cancel` | `deposits.create` |
| GET | `/withdrawals/limits` | `withdrawals.view` |
| GET | `/withdrawals/methods` | `withdrawals.view` |
| GET | `/withdrawals` | `withdrawals.view` |
| GET | `/withdrawals/:id` | `withdrawals.view` |
| POST | `/withdrawals` | `withdrawals.create` |
| POST | `/withdrawals/:id/cancel` | `withdrawals.create` |

### Create deposit

```json
{
  "amount": "100.00",
  "methodId": "<uuid>",
  "userReference": "optional",
  "txHash": "optional-unique",
  "idempotencyKey": "client-unique-key"
}
```

### Create withdrawal

```json
{
  "amount": "50.00",
  "payoutMethodId": "<uuid>",
  "idempotencyKey": "client-unique-key"
}
```

KYC must be `APPROVED`. Wallets are provisioned on KYC approval.

---

## Admin finance

| Method | Path | Permission |
|--------|------|------------|
| GET | `/admin/finance/metrics` | `finance.view` |
| GET | `/admin/wallets` | `finance.view` |
| POST | `/admin/wallets/:userId/adjust` | `finance.adjust` |
| GET | `/admin/deposits` | `finance.view` |
| GET | `/admin/deposits/:id` | `finance.view` |
| POST | `/admin/deposits/:id/review` | `finance.review` |
| POST | `/admin/deposits/:id/approve` | `finance.review` |
| POST | `/admin/deposits/:id/reject` | `finance.review` |
| GET | `/admin/withdrawals` | `finance.view` |
| GET | `/admin/withdrawals/:id` | `finance.view` |
| POST | `/admin/withdrawals/:id/review` | `finance.review` |
| POST | `/admin/withdrawals/:id/approve` | `finance.review` |
| POST | `/admin/withdrawals/:id/reject` | `finance.review` |
| POST | `/admin/withdrawals/:id/mark-paid` | `finance.review` |
| GET/POST/PATCH/DELETE | `/admin/payment-methods` | `finance.manage` |
| GET/POST/PATCH/DELETE | `/admin/wallet-addresses` | `finance.manage` |
| GET | `/admin/ledger` | `finance.view` |

### Review bodies

Deposit: `{ "decision": "APPROVE"|"REJECT"|"REQUEST_INFORMATION"|"FORCE_COMPLETE"|"FORCE_CANCEL", "reason?", "creditedAmount?", "internalNotes?" }`  
Withdrawal: `{ "decision": "APPROVE"|"REJECT"|"PAID"|"REQUEST_INFORMATION"|"FORCE_COMPLETE"|"FORCE_CANCEL", "reason?", "transactionRef?", "internalNotes?" }`

Search/filter: `q`, `status`, `paymentMethodId`, `reviewerId`, `from`, `to`, `minAmount`, `maxAmount`, `page`, `limit`.

---

## Metrics

`GET /admin/finance/metrics` returns today’s deposits/withdrawals, pending counts, total volume, total profit, aggregated wallet balances, pending reviews.
