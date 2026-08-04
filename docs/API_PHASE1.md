# API Documentation — Phase 1 (Auth & Foundation)

Base URL: `http://localhost:4000`

All JSON responses use the shared envelope:

```json
{
  "success": true,
  "data": {},
  "meta": { "requestId": "uuid", "timestamp": "ISO-8601" }
}
```

Errors:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} },
  "meta": { "requestId": "uuid", "timestamp": "ISO-8601" }
}
```

Cookies carry auth (`credentials: 'include'` from the browser).

---

## Health

### `GET /api/health`

Returns process + database status.

### `GET /api/version`

Returns app name, version, and Node runtime.

---

## Auth (`/api/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Create investor account |
| POST | `/login` | No | Sign in; sets cookies |
| POST | `/logout` | Optional | Revoke session; clears cookies |
| POST | `/refresh` | Refresh cookie | Rotate refresh + access tokens |
| GET | `/me` | Access cookie | Current user (+ `wallet: null` in Phase 1) |
| POST | `/verify-email` | No | `{ token }` |
| POST | `/verify-email/resend` | No | `{ email }` |
| POST | `/forgot-password` | No | `{ email }` |
| POST | `/reset-password` | No | `{ token, password }` |
| POST | `/change-password` | Access cookie | `{ currentPassword, newPassword }` |
| GET | `/sessions` | Access cookie | List active sessions |
| DELETE | `/sessions/:id` | Access cookie | Revoke another session |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/users/me` | Access cookie | Alias of auth `/me` |

---

## Request examples

### Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "investor@example.com",
  "password": "Str0ng!Pass",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "phone": "+15551234567",
  "country": "US",
  "referralCode": "ABCD1234"
}
```

Response `201`:

```json
{ "success": true, "data": { "userId": "..." }, "meta": {} }
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "investor@example.com",
  "password": "Str0ng!Pass"
}
```

Sets `mfx_at`, `mfx_rt`, `mfx_csrf`. Body:

```json
{
  "success": true,
  "data": { "user": { "...": "..." }, "wallet": null },
  "meta": {}
}
```

Email must be verified before login succeeds (`EMAIL_NOT_VERIFIED`).

### Refresh

```http
POST /api/v1/auth/refresh
```

Uses `mfx_rt` cookie. Returns `data: null` and refreshed cookies.

---

## Password rules

- Minimum 10 characters
- At least one lowercase, uppercase, number, and special character

---

## Error codes used in Phase 1

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `FORBIDDEN`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_SUSPENDED`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR`

---

## Out of scope (later phases)

Deposits, withdrawals, wallets, trading engine, reports, notifications delivery, admin dashboard business logic, KYC workflows, support tickets.
