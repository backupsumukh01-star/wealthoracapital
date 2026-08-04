# 08 — Authentication Flow

Four entry paths (email register, email login, Google OAuth, password reset), one token model, and
a set of failure behaviours that are as carefully specified as the happy paths — because auth bugs
are almost always in the failure branches.

---

## 1. Token model

| Token | Lifetime | Storage | Contents |
|-------|----------|---------|----------|
| **Access token** | 15 minutes | `mfx_at` cookie — `httpOnly`, `Secure`, `SameSite=Lax` | `sub`, `role`, `sid`, `jti`, `iat`, `exp` |
| **Refresh token** | 7 days (30 with *remember me*) | `mfx_rt` cookie — `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/v1/auth` | Opaque 256-bit random value |
| **CSRF token** | Session | `mfx_csrf` cookie — readable by JS — plus `X-CSRF-Token` header | Random, double-submit |

### Deliberate choices

- **The refresh token is opaque, not a JWT.** It is a random value whose SHA-256 hash is stored in
  `Session.refreshTokenHash`. This makes revocation instant and real: delete the row and the token
  is dead. A self-contained JWT refresh token cannot be revoked without a blocklist, which is a
  blocklist you then have to maintain.
- **Cookies, not `localStorage`.** `httpOnly` means an XSS payload cannot read the token. The cost
  is CSRF exposure, which the double-submit token and `SameSite` handle.
- **`SameSite=Strict` on the refresh cookie, `Lax` on the access cookie.** The refresh cookie is
  only ever sent to `/api/v1/auth/*` from our own origin; the access cookie needs `Lax` so
  top-level navigations to protected pages work.
- **15 minutes is short on purpose.** A stolen access token has a small window, and silent refresh
  makes the shortness invisible to the user.

### Access token payload

```jsonc
{
  "sub": "b3f1…",            // user id
  "role": "USER",
  "sid": "9c22…",            // session id — lets us revoke a single device
  "jti": "01J2X…",
  "iat": 1785000000,
  "exp": 1785000900,
  "iss": "meridian-fx",
  "aud": "meridian-fx-web"
}
```

No email, no name, no balance. A JWT is readable by anyone who has it; it carries identity and
authorisation only. Everything else comes from `GET /auth/me`.

---

## 2. Registration

```
User submits /register
   │
   ├─ Zod validation (shared schema, identical client & server)
   ├─ Password rules: ≥10 chars, zxcvbn score ≥3, checked against
   │                  HaveIBeenPwned k-anonymity range API
   ├─ Email normalised (lowercase, trimmed) — stored as citext
   ├─ acceptTerms and acceptRisk must both be true → timestamped on the user
   │
   ├─ Email already exists?
   │     └─ YES → 200 with the SAME generic message as success.
   │              An email is sent to the existing address saying
   │              "someone tried to register with your address —
   │               log in, or reset your password."
   │              ⚠ We never confirm to a stranger that an account exists.
   │
   ├─ Create User (status = PENDING_VERIFICATION, passwordHash = argon2id)
   ├─ Create VerificationToken (32 random bytes; only the SHA-256 hash is stored, TTL 24h)
   ├─ Queue verification email
   │
   └─ 201 "Check your email to verify your account."
        ❗ No tokens issued. No wallet created yet.
```

**Argon2id parameters:** `memoryCost 19456 KiB (19 MB)`, `timeCost 2`, `parallelism 1` — the
OWASP-recommended baseline. Benchmarked on the production VPS to target ~250ms per hash and
recorded in the deployment notes so a future host change doesn't silently weaken it.

### Email verification

```
GET /verify-email?token=<raw>
   │
   ├─ hash the raw token → look up VerificationToken by hash
   ├─ not found       → "This link is invalid." + resend option
   ├─ expired         → "This link has expired." + resend option (works logged-out)
   ├─ already used    → if the user is already verified: success message, not an error
   │
   └─ valid:
        User.emailVerifiedAt = now
        User.status = ACTIVE
        Wallet created (balance 0)          ← first moment a wallet exists
        VerificationToken.usedAt = now
        Welcome email queued
        Redirect to /login?verified=1
```

Creating the wallet at verification rather than registration means unverified, potentially
throwaway accounts never appear in the wallet table or in daily-return eligibility queries.

---

## 3. Login (email + password)

```
POST /auth/login
   │
   ├─ Rate limit: 5 per email + 10 per IP per 15 min
   ├─ Look up user by normalised email
   │
   ├─ User not found?
   │     └─ Still run a dummy argon2 verify against a fixed hash,
   │        then return the same generic error.
   │        ⚠ Constant-ish time — otherwise response timing enumerates accounts.
   │
   ├─ lockedUntil in the future?      → 403 with the unlock time
   ├─ status = SUSPENDED?             → 403 ACCOUNT_SUSPENDED with the reason category
   ├─ passwordHash is null?           → "This account uses Google sign-in." + Google button
   │
   ├─ Verify password
   │     └─ FAIL → failedLoginCount++
   │               at 5 → lockedUntil = now + 15 min, security email sent
   │               → 401 "Incorrect email or password."   (never "wrong password")
   │
   ├─ emailVerifiedAt is null?        → 403 EMAIL_NOT_VERIFIED, resend triggered,
   │                                     client routes to /verify-email/sent
   │
   └─ SUCCESS
        failedLoginCount = 0, lockedUntil = null
        lastLoginAt / lastLoginIp recorded
        Create Session { familyId = new uuid, refreshTokenHash, ua, ip, expiresAt }
        Set mfx_at, mfx_rt, mfx_csrf
        If the device/IP is unrecognised → "new device login" security email
        Rehash the password if argon2 params have since been strengthened
        200 → { user, wallet summary }
```

The error message is identical for "no such user" and "wrong password", and the timing is
equalised. Any difference between the two is an account-enumeration oracle.

---

## 4. Google OAuth

Authorization Code flow with PKCE, even though we have a confidential client — it costs nothing and
removes a whole class of interception attacks.

```
GET /auth/google
   │  generate state (random, 10 min TTL, stored server-side or in a signed cookie)
   │  generate code_verifier → code_challenge (S256)
   │  redirect to accounts.google.com with scope=openid email profile
   ▼
User consents at Google
   ▼
GET /auth/google/callback?code=…&state=…
   │
   ├─ Validate state         → mismatch/expired = 400, log as a security event
   ├─ Exchange code + verifier for tokens (server-to-server)
   ├─ Verify the ID token signature, issuer, audience and expiry
   ├─ Require email_verified = true from Google, else reject
   │
   ├─ Existing OAuthAccount(google, sub)?
   │     └─ YES → log in as that user
   │
   ├─ Existing User with that email?
   │     └─ YES and email verified → LINK the Google account to it, then log in
   │        YES but unverified     → verify it now (Google has proven the address), link, log in
   │
   └─ NO → create User { emailVerifiedAt = now, status = ACTIVE, passwordHash = null }
           create OAuthAccount, create Wallet, send welcome email
           ⚠ terms/risk acceptance is not yet recorded → the user is redirected to a
             one-screen consent step before they can deposit
   │
   └─ Set cookies, redirect to /dashboard (or the stored `next` path)
```

### Account linking safety

Linking by email is safe **only** because we require Google to assert `email_verified`. Without
that check, anyone could register a Google account claiming someone else's address and take over
their platform account. This is the single most important line in the OAuth implementation.

A user with a linked Google account and no password can set one from `/settings/security` via the
password-reset mechanism.

---

## 5. Token refresh and rotation

```
POST /auth/refresh   (mfx_rt cookie, no body)
   │
   ├─ Hash the presented token, find the Session
   │
   ├─ Not found        → 401, clear cookies
   ├─ Expired          → 401, clear cookies, delete the session
   │
   ├─ Already revoked / replaced?   ⚠ REUSE DETECTED
   │     └─ Someone is replaying an old refresh token. Either it was stolen,
   │        or a legitimate client raced. We assume theft:
   │          • revoke EVERY session in that familyId
   │          • write a security AuditLog entry
   │          • email the user: "we signed you out everywhere"
   │          • 401
   │
   └─ Valid:
        mark this session revoked, replacedBy = new session id
        create a new Session in the SAME familyId with a new refresh token
        issue a new access token
        200 → new cookies
```

Rotation with reuse detection is what makes a 7-day refresh token acceptable. Without it, a stolen
refresh token is a week-long free pass; with it, the theft is detected the moment either party
uses a rotated token, and both are logged out.

### Client-side silent refresh

```
apiClient request
   ├─ 200 → return
   └─ 401 TOKEN_EXPIRED
        ├─ is a refresh already in flight?  → wait for it (single-flight promise)
        ├─ POST /auth/refresh
        │    ├─ success → retry the original request ONCE
        │    └─ failure → clear session state, redirect to /login?next=<current path>
        └─ never retry more than once, to avoid an infinite loop
```

The single-flight guard matters: a dashboard firing six parallel queries when the token expires
must produce **one** refresh call, not six racing rotations that trigger reuse detection against
each other.

---

## 6. Password reset

```
POST /auth/forgot-password { email }
   │
   ├─ Rate limit 3 per email per hour
   ├─ ALWAYS respond 200 with the same message, whether or not the account exists
   │
   └─ If it exists and has a password:
        invalidate any outstanding reset tokens for that user
        create VerificationToken(PASSWORD_RESET), 32 bytes, hash stored, TTL 1 hour
        email the link
      If it exists but is Google-only:
        email them explaining they sign in with Google — no reset link
```

```
POST /auth/reset-password { token, password }
   │
   ├─ Validate token: exists, correct type, not expired, not used
   ├─ Apply the same password rules as registration
   ├─ Reject if the new password matches the current one
   │
   └─ Success:
        passwordHash updated, passwordChangedAt = now
        token marked used
        failedLoginCount = 0, lockedUntil = null
        ⚠ ALL sessions revoked — a reset means "I may have been compromised"
        Confirmation email sent
        Redirect to /login?reset=1
```

Revoking all sessions on reset is not optional. If an attacker had a live session, a password reset
that leaves it running has accomplished nothing.

### Change password (while logged in)

Requires the current password. On success: `passwordChangedAt` updated, **all other** sessions
revoked (the current one survives so the user isn't kicked out of the page they're on), and a
security email is sent.

---

## 7. Route protection

### Server (Express)

```
authenticate       → verify signature, expiry, issuer, audience
                     load the session by `sid`; reject if revoked
                     reject if `iat` < user.passwordChangedAt   ← kills tokens issued
                     attach req.user                              before a password change
requireVerified    → 403 EMAIL_NOT_VERIFIED if emailVerifiedAt is null
authorize(...roles)→ 403 FORBIDDEN if the role doesn't match
```

Checking `iat` against `passwordChangedAt` closes the 15-minute window in which an access token
issued before a password change would otherwise still work.

### Client (Next.js `middleware.ts`)

```
/(marketing)/*   → always public
/(auth)/*        → if already authenticated, redirect to /dashboard
/(dashboard)/*   → require a session cookie, else /login?next=<path>
/(admin)/*       → require a session cookie AND role ∈ {ADMIN, SUPER_ADMIN}, else 404
```

Middleware does a **cheap** check (cookie presence and a decoded role claim) purely for routing and
flicker prevention. It is a UX optimisation, not a security control — the API re-verifies
everything on every request. Admin routes return **404 rather than 403** to unauthorised users so
the admin surface isn't discoverable.

---

## 8. Sessions and devices

`/settings/security` lists every active session with device, browser, IP, approximate location,
last used and a "this device" marker. The user can revoke one or all.

The same list powers the new-device email: when a login arrives from a user-agent/IP combination
not seen before, we send a security notification with a one-click "this wasn't me" link that
revokes everything and forces a reset.

---

## 9. Failure matrix

| Scenario | Response | User-visible message |
|----------|----------|---------------------|
| Wrong password | 401 | "Incorrect email or password." |
| Unknown email on login | 401 | "Incorrect email or password." (identical) |
| 5 failed attempts | 403 | "Too many attempts. Try again in 15 minutes." + email |
| Unverified email | 403 `EMAIL_NOT_VERIFIED` | "Verify your email to continue." + resend |
| Suspended | 403 `ACCOUNT_SUSPENDED` | "Your account is suspended." + support contact |
| Expired access token | 401 `TOKEN_EXPIRED` | *(invisible — silent refresh)* |
| Expired refresh token | 401 | "Your session expired. Please sign in again." |
| **Refresh token reuse** | 401 + family revoked | "We signed you out of all devices for your security." + email |
| Tampered JWT | 401 | Generic session error; logged as a security event |
| Expired verification link | 400 | "This link has expired." + resend button |
| Reused verification link | 200 | "Your email is already verified." (not an error) |
| Expired reset link | 400 | "This link has expired." + request a new one |
| OAuth state mismatch | 400 | "Sign-in failed. Please try again." + security log |
| Google email unverified | 400 | "Your Google email isn't verified." |
| Password-login attempt on a Google-only account | 400 | "This account uses Google sign-in." + button |
| Rate limited | 429 | "Too many requests. Try again in N seconds." |

---

## 10. Auth security checklist

- [ ] Argon2id with OWASP parameters, benchmarked on production hardware
- [ ] Passwords checked against HaveIBeenPwned via k-anonymity (prefix only, never the full hash)
- [ ] Identical response and comparable timing for unknown-email and wrong-password
- [ ] Registration never reveals whether an email is already in use
- [ ] Access tokens 15 min; refresh tokens opaque, hashed at rest, rotated on every use
- [ ] Refresh reuse revokes the entire token family and notifies the user
- [ ] All auth cookies `httpOnly` + `Secure` + appropriate `SameSite` + `__Host-` prefix in prod
- [ ] CSRF double-submit token on every cookie-authenticated state-changing request
- [ ] Password reset and password change revoke sessions
- [ ] Access tokens issued before `passwordChangedAt` are rejected
- [ ] OAuth uses PKCE + state; ID token signature, `iss`, `aud`, `exp` all verified
- [ ] Account linking requires a Google-verified email
- [ ] Rate limits on login, register, forgot-password and resend
- [ ] Account lockout after 5 failures, with an email to the account owner
- [ ] Admin accounts require 2FA and are invite-only — no admin registration route exists
- [ ] Every auth event (login, failure, reset, revoke, reuse detection) is audit-logged
- [ ] Verification and reset tokens are single-use, hashed at rest, and time-limited
- [ ] Admin routes 404 rather than 403 for non-admins
