# 04 — Database Schema

PostgreSQL 16 + Prisma 6. Every monetary column is `Decimal(20, 8)`; every percentage is
`Decimal(10, 6)`; every timestamp is `timestamptz` stored in UTC.

---

## 1. Entity relationship overview

```
                                  ┌──────────────┐
                                  │    User      │
                                  └──────┬───────┘
        ┌──────────────┬─────────────────┼─────────────────┬───────────────┐
        │              │                 │                 │               │
        ▼              ▼                 ▼                 ▼               ▼
  ┌───────────┐  ┌───────────┐    ┌────────────┐   ┌──────────────┐  ┌──────────┐
  │  Wallet   │  │  Session  │    │OAuthAccount│   │Notification  │  │PayoutMtd │
  └─────┬─────┘  └───────────┘    └────────────┘   └──────────────┘  └──────────┘
        │
        │  1 ─── n
        ▼
  ┌──────────────┐        ┌──────────────┐        ┌────────────────┐
  │ LedgerEntry  │◄───────│   Deposit    │        │  Withdrawal    │
  │ (immutable)  │        └──────────────┘        └────────────────┘
  └──────▲───────┘                ▲                        ▲
         │                        └────────────┬───────────┘
         │                                     │ referenced by
         │                                     │
  ┌──────┴─────────────┐              ┌────────────────────┐
  │ ProfitDistribution │◄─────────────│  DailyReturnRun    │
  └────────────────────┘   1 ─── n    └─────────┬──────────┘
                                                 │ 1 ─── 1
                                                 ▼
                                        ┌────────────────┐        ┌─────────┐
                                        │   TradingDay   │────────│  Trade  │
                                        └────────────────┘ 1─── n └─────────┘

  Supporting: Setting · AuditLog · EmailTemplate · Broadcast · OutboxEvent
              VerificationToken · PaymentMethod · NotificationPreference
```

**The three relationships that matter most:**

1. `Wallet 1—n LedgerEntry` — the ledger is the source of truth; `Wallet.balance` is a cache.
2. `TradingDay 1—1 DailyReturnRun` — a unique constraint here is what makes double-application
   impossible.
3. `DailyReturnRun 1—n ProfitDistribution 1—1 LedgerEntry` — every distributed cent traces back
   to a specific run, and every run traces back to specific trades.

---

## 2. Enumerations

```prisma
enum Role                 { USER  ADMIN  SUPER_ADMIN }
enum UserStatus           { PENDING_VERIFICATION  ACTIVE  SUSPENDED  CLOSED }
enum KycStatus            { NOT_STARTED  PENDING  APPROVED  REJECTED }

enum AuthProvider         { EMAIL  GOOGLE }
enum TokenType            { EMAIL_VERIFICATION  PASSWORD_RESET  EMAIL_CHANGE }

enum DepositStatus        { PENDING  UNDER_REVIEW  APPROVED  REJECTED  CANCELLED }
enum WithdrawalStatus     { PENDING  UNDER_REVIEW  APPROVED  PAID  REJECTED  CANCELLED }
enum PaymentMethodType    { BANK_TRANSFER  CRYPTO  MOBILE_WALLET  OTHER }

enum LedgerEntryType {
  DEPOSIT_APPROVED
  WITHDRAWAL_LOCKED
  WITHDRAWAL_COMPLETED
  WITHDRAWAL_REFUNDED
  PROFIT_DISTRIBUTION
  PROFIT_REVERSAL
  ADJUSTMENT_CREDIT
  ADJUSTMENT_DEBIT
  FEE
  BONUS
}

enum TradeDirection       { BUY  SELL }
enum TradeOutcome         { WIN  LOSS  BREAKEVEN }
enum TradeSource          { MANUAL  CSV_IMPORT  MT5_IMPORT  API }

enum TradingDayStatus     { DRAFT  PUBLISHED  DISTRIBUTED  REVERSED }
enum DailyReturnRunStatus { PENDING  PROCESSING  COMPLETED  FAILED  REVERSED }
enum ReturnBasis          { BALANCE  INVESTED }        // compounding vs simple

enum NotificationType {
  DEPOSIT_APPROVED  DEPOSIT_REJECTED
  WITHDRAWAL_APPROVED  WITHDRAWAL_REJECTED  WITHDRAWAL_PAID
  DAILY_PROFIT  DAILY_LOSS
  ACCOUNT_SECURITY  ANNOUNCEMENT  SYSTEM
}
enum NotificationChannel  { IN_APP  EMAIL  TELEGRAM  WHATSAPP }
enum DeliveryStatus       { QUEUED  SENT  FAILED  SKIPPED }

enum BroadcastStatus      { DRAFT  SCHEDULED  SENDING  SENT  FAILED }
enum OutboxStatus         { PENDING  PROCESSING  DONE  DEAD }
```

---

## 3. Models

### 3.1 Identity

```prisma
model User {
  id                String     @id @default(uuid()) @db.Uuid
  email             String     @unique @db.Citext        // case-insensitive
  emailVerifiedAt   DateTime?  @map("email_verified_at")
  passwordHash      String?    @map("password_hash")     // null = OAuth-only
  firstName         String     @map("first_name") @db.VarChar(60)
  lastName          String     @map("last_name")  @db.VarChar(60)
  phone             String?    @db.VarChar(24)
  country           String?    @db.Char(2)               // ISO 3166-1 alpha-2
  timezone          String     @default("UTC")
  avatarKey         String?    @map("avatar_key")        // storage key, not a path
  role              Role       @default(USER)
  status            UserStatus @default(PENDING_VERIFICATION)
  kycStatus         KycStatus  @default(NOT_STARTED) @map("kyc_status")

  // security
  twoFactorSecret   String?    @map("two_factor_secret")
  twoFactorEnabled  Boolean    @default(false) @map("two_factor_enabled")
  failedLoginCount  Int        @default(0) @map("failed_login_count")
  lockedUntil       DateTime?  @map("locked_until")
  lastLoginAt       DateTime?  @map("last_login_at")
  lastLoginIp       String?    @map("last_login_ip") @db.Inet
  passwordChangedAt DateTime?  @map("password_changed_at")

  // consent — required for the compliance posture
  termsAcceptedAt   DateTime?  @map("terms_accepted_at")
  riskAcceptedAt    DateTime?  @map("risk_accepted_at")
  marketingOptIn    Boolean    @default(false) @map("marketing_opt_in")

  referralCode      String?    @unique @map("referral_code") @db.VarChar(16)
  referredById      String?    @map("referred_by_id") @db.Uuid
  referredBy        User?      @relation("Referrals", fields: [referredById], references: [id])
  referrals         User[]     @relation("Referrals")

  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")
  deletedAt         DateTime?  @map("deleted_at")        // soft delete only

  wallet            Wallet?
  sessions          Session[]
  oauthAccounts     OAuthAccount[]
  verificationTokens VerificationToken[]
  deposits          Deposit[]
  withdrawals       Withdrawal[]
  payoutMethods     PayoutMethod[]
  distributions     ProfitDistribution[]
  notifications     Notification[]
  notificationPrefs NotificationPreference[]
  auditLogs         AuditLog[]  @relation("ActorAuditLogs")

  @@index([status])
  @@index([role])
  @@index([createdAt])
  @@map("users")
}
```

**Why `passwordHash` is nullable:** a Google-only user never has one. Login must therefore branch
on provider rather than assume a hash exists — a classic source of "cannot read property of null"
in auth code.

```prisma
model Session {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshTokenHash  String   @unique @map("refresh_token_hash")   // sha256, never raw
  familyId          String   @map("family_id") @db.Uuid           // rotation lineage
  userAgent         String?  @map("user_agent") @db.VarChar(400)
  ip                String?  @db.Inet
  expiresAt         DateTime @map("expires_at")
  revokedAt         DateTime? @map("revoked_at")
  replacedById      String?  @map("replaced_by_id") @db.Uuid
  createdAt         DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@index([familyId])
  @@index([expiresAt])
  @@map("sessions")
}

model OAuthAccount {
  id             String       @id @default(uuid()) @db.Uuid
  userId         String       @map("user_id") @db.Uuid
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider       AuthProvider
  providerUserId String       @map("provider_user_id")
  email          String?
  createdAt      DateTime     @default(now()) @map("created_at")

  @@unique([provider, providerUserId])
  @@map("oauth_accounts")
}

model VerificationToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique @map("token_hash")      // sha256 of the emailed token
  type      TokenType
  payload   Json?                                     // e.g. pending new email
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @default(now()) @map("created_at")

  @@index([userId, type])
  @@map("verification_tokens")
}
```

### 3.2 Money core

```prisma
model Wallet {
  id             String   @id @default(uuid()) @db.Uuid
  userId         String   @unique @map("user_id") @db.Uuid
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  currency       String   @default("USD") @db.Char(3)   // reserved for multi-currency

  balance        Decimal  @default(0) @db.Decimal(20, 8)   // projection of the ledger
  lockedBalance  Decimal  @default(0) @map("locked_balance") @db.Decimal(20, 8)
  investedAmount Decimal  @default(0) @map("invested_amount") @db.Decimal(20, 8)
  totalProfit    Decimal  @default(0) @map("total_profit") @db.Decimal(20, 8)
  totalDeposited Decimal  @default(0) @map("total_deposited") @db.Decimal(20, 8)
  totalWithdrawn Decimal  @default(0) @map("total_withdrawn") @db.Decimal(20, 8)

  version        Int      @default(0)     // optimistic concurrency guard
  lastReconciledAt DateTime? @map("last_reconciled_at")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  ledgerEntries  LedgerEntry[]

  @@map("wallets")
}
```

> **Available balance** is a derived value, never a column: `balance − lockedBalance`.
> Storing it would create a third thing that can disagree with the other two.

```prisma
model LedgerEntry {
  id            String          @id @default(uuid()) @db.Uuid
  walletId      String          @map("wallet_id") @db.Uuid
  wallet        Wallet          @relation(fields: [walletId], references: [id])

  type          LedgerEntryType
  amount        Decimal         @db.Decimal(20, 8)   // signed: + credit, − debit
  balanceBefore Decimal         @map("balance_before") @db.Decimal(20, 8)
  balanceAfter  Decimal         @map("balance_after")  @db.Decimal(20, 8)

  referenceType String?         @map("reference_type") @db.VarChar(40) // 'Deposit'
  referenceId   String?         @map("reference_id") @db.Uuid
  idempotencyKey String?        @unique @map("idempotency_key")

  description   String?         @db.VarChar(300)
  metadata      Json?
  createdById   String?         @map("created_by_id") @db.Uuid   // admin, if manual
  createdAt     DateTime        @default(now()) @map("created_at")

  @@index([walletId, createdAt])
  @@index([type])
  @@index([referenceType, referenceId])
  @@map("ledger_entries")
}
```

**Rules enforced in the database, not just in code:**

- `balance_after = balance_before + amount` — a `CHECK` constraint.
- No `UPDATE` or `DELETE` — a trigger raises an exception on either. Corrections are new rows.
- `idempotencyKey` unique — the mechanism that makes a retried credit safe.

```sql
-- migration: guard the ledger
ALTER TABLE ledger_entries
  ADD CONSTRAINT ledger_balance_math
  CHECK (balance_after = balance_before + amount);

CREATE OR REPLACE FUNCTION ledger_is_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only (attempted %)', TG_OP;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_no_mutate
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION ledger_is_append_only();

ALTER TABLE wallets ADD CONSTRAINT wallet_non_negative CHECK (balance >= 0);
ALTER TABLE wallets ADD CONSTRAINT wallet_locked_valid  CHECK (locked_balance >= 0 AND locked_balance <= balance);
```

### 3.3 Deposits & withdrawals

```prisma
model PaymentMethod {                    // admin-configured deposit channels
  id           String            @id @default(uuid()) @db.Uuid
  name         String            @db.VarChar(80)        // "Bank Transfer — HBL"
  type         PaymentMethodType
  instructions String            @db.Text               // markdown, shown to users
  accountDetails Json                                    // account no, IBAN, wallet address
  logoKey      String?           @map("logo_key")
  minAmount    Decimal           @default(50) @map("min_amount") @db.Decimal(20, 8)
  maxAmount    Decimal?          @map("max_amount") @db.Decimal(20, 8)
  isActive     Boolean           @default(true) @map("is_active")
  sortOrder    Int               @default(0) @map("sort_order")
  createdAt    DateTime          @default(now()) @map("created_at")
  updatedAt    DateTime          @updatedAt @map("updated_at")

  deposits     Deposit[]
  @@map("payment_methods")
}

model Deposit {
  id              String        @id @default(uuid()) @db.Uuid
  reference       String        @unique @db.VarChar(20)   // "DEP-2026-000412"
  userId          String        @map("user_id") @db.Uuid
  user            User          @relation(fields: [userId], references: [id])
  paymentMethodId String?       @map("payment_method_id") @db.Uuid
  paymentMethod   PaymentMethod? @relation(fields: [paymentMethodId], references: [id])

  amount          Decimal       @db.Decimal(20, 8)
  creditedAmount  Decimal?      @map("credited_amount") @db.Decimal(20, 8) // after any fee
  fee             Decimal       @default(0) @db.Decimal(20, 8)
  currency        String        @default("USD") @db.Char(3)

  status          DepositStatus @default(PENDING)
  proofKey        String?       @map("proof_key")          // storage key
  proofMimeType   String?       @map("proof_mime_type") @db.VarChar(60)
  userReference   String?       @map("user_reference") @db.VarChar(120) // their txn id
  userNote        String?       @map("user_note") @db.VarChar(500)

  reviewedById    String?       @map("reviewed_by_id") @db.Uuid
  reviewedAt      DateTime?     @map("reviewed_at")
  adminNote       String?       @map("admin_note") @db.VarChar(500)
  rejectionReason String?       @map("rejection_reason") @db.VarChar(300)

  ledgerEntryId   String?       @unique @map("ledger_entry_id") @db.Uuid
  ipAddress       String?       @map("ip_address") @db.Inet
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@index([userId, status])
  @@index([status, createdAt])
  @@map("deposits")
}

model PayoutMethod {                     // a user's saved destination
  id         String            @id @default(uuid()) @db.Uuid
  userId     String            @map("user_id") @db.Uuid
  user       User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  label      String            @db.VarChar(60)
  type       PaymentMethodType
  details    Json                                    // encrypted at rest (app-level)
  isDefault  Boolean           @default(false) @map("is_default")
  isVerified Boolean           @default(false) @map("is_verified")
  createdAt  DateTime          @default(now()) @map("created_at")

  withdrawals Withdrawal[]
  @@index([userId])
  @@map("payout_methods")
}

model Withdrawal {
  id              String           @id @default(uuid()) @db.Uuid
  reference       String           @unique @db.VarChar(20)   // "WDR-2026-000077"
  userId          String           @map("user_id") @db.Uuid
  user            User             @relation(fields: [userId], references: [id])
  payoutMethodId  String?          @map("payout_method_id") @db.Uuid
  payoutMethod    PayoutMethod?    @relation(fields: [payoutMethodId], references: [id])

  amount          Decimal          @db.Decimal(20, 8)      // requested
  fee             Decimal          @default(0) @db.Decimal(20, 8)
  netAmount       Decimal          @map("net_amount") @db.Decimal(20, 8) // actually sent
  currency        String           @default("USD") @db.Char(3)

  status          WithdrawalStatus @default(PENDING)
  destinationSnapshot Json         @map("destination_snapshot") // frozen at request time

  reviewedById    String?          @map("reviewed_by_id") @db.Uuid
  reviewedAt      DateTime?        @map("reviewed_at")
  paidAt          DateTime?        @map("paid_at")
  paymentProofKey String?          @map("payment_proof_key")
  transactionRef  String?          @map("transaction_ref") @db.VarChar(120)
  adminNote       String?          @map("admin_note") @db.VarChar(500)
  rejectionReason String?          @map("rejection_reason") @db.VarChar(300)

  lockLedgerEntryId  String?       @unique @map("lock_ledger_entry_id") @db.Uuid
  finalLedgerEntryId String?       @unique @map("final_ledger_entry_id") @db.Uuid
  ipAddress       String?          @map("ip_address") @db.Inet
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")

  @@index([userId, status])
  @@index([status, createdAt])
  @@map("withdrawals")
}
```

**`destinationSnapshot` matters.** If a user edits their bank details after requesting a
withdrawal, the request must still show where the money was going when it was approved. Snapshot,
don't join.

### 3.4 Trading

```prisma
model TradingDay {
  id                String            @id @default(uuid()) @db.Uuid
  date              DateTime          @unique @db.Date        // one row per calendar day
  status            TradingDayStatus  @default(DRAFT)

  netReturnPct      Decimal?          @map("net_return_pct") @db.Decimal(10, 6)
  computedReturnPct Decimal?          @map("computed_return_pct") @db.Decimal(10, 6)
  isOverridden      Boolean           @default(false) @map("is_overridden")
  overrideReason    String?           @map("override_reason") @db.VarChar(300)

  tradeCount        Int               @default(0) @map("trade_count")
  winCount          Int               @default(0) @map("win_count")
  lossCount         Int               @default(0) @map("loss_count")
  summary           String?           @db.VarChar(1000)   // shown to users
  publishedAt       DateTime?         @map("published_at")

  createdById       String?           @map("created_by_id") @db.Uuid
  createdAt         DateTime          @default(now()) @map("created_at")
  updatedAt         DateTime          @updatedAt @map("updated_at")

  trades            Trade[]
  returnRun         DailyReturnRun?

  @@index([date])
  @@index([status])
  @@map("trading_days")
}
```

`computedReturnPct` is the sum/aggregate of the day's trades; `netReturnPct` is what is actually
distributed. They are usually identical — but when an operator overrides (e.g. to hold back a
reserve), the original stays visible and the reason is mandatory.

```prisma
model Trade {
  id            String         @id @default(uuid()) @db.Uuid
  tradingDayId  String         @map("trading_day_id") @db.Uuid
  tradingDay    TradingDay     @relation(fields: [tradingDayId], references: [id], onDelete: Cascade)

  pair          String         @db.VarChar(12)       // "EUR/USD"
  direction     TradeDirection
  entryPrice    Decimal        @map("entry_price") @db.Decimal(18, 8)
  exitPrice     Decimal        @map("exit_price")  @db.Decimal(18, 8)
  stopLoss      Decimal?       @map("stop_loss")   @db.Decimal(18, 8)
  takeProfit    Decimal?       @map("take_profit") @db.Decimal(18, 8)
  lotSize       Decimal?       @map("lot_size") @db.Decimal(12, 4)

  returnPct     Decimal        @map("return_pct") @db.Decimal(10, 6)  // e.g. 0.700000
  pips          Decimal?       @db.Decimal(12, 2)
  outcome       TradeOutcome
  openedAt      DateTime?      @map("opened_at")
  closedAt      DateTime?      @map("closed_at")

  notes         String?        @db.VarChar(1000)
  isPublic      Boolean        @default(true) @map("is_public")   // visible to investors
  source        TradeSource    @default(MANUAL)
  chartImageKey String?        @map("chart_image_key")

  createdById   String?        @map("created_by_id") @db.Uuid
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")

  @@index([tradingDayId])
  @@index([pair])
  @@index([createdAt])
  @@map("trades")
}
```

### 3.5 The distribution engine tables

```prisma
model DailyReturnRun {
  id             String               @id @default(uuid()) @db.Uuid
  tradingDayId   String               @unique @map("trading_day_id") @db.Uuid  // ← idempotency
  tradingDay     TradingDay           @relation(fields: [tradingDayId], references: [id])

  returnPct      Decimal              @map("return_pct") @db.Decimal(10, 6)
  returnBasis    ReturnBasis          @default(BALANCE) @map("return_basis")
  status         DailyReturnRunStatus @default(PENDING)

  eligibleWallets Int                 @default(0) @map("eligible_wallets")
  processedWallets Int                @default(0) @map("processed_wallets")
  totalBaseAmount Decimal             @default(0) @map("total_base_amount") @db.Decimal(24, 8)
  totalDistributed Decimal            @default(0) @map("total_distributed") @db.Decimal(24, 8)
  roundingDelta   Decimal             @default(0) @map("rounding_delta") @db.Decimal(20, 8)

  startedAt      DateTime?            @map("started_at")
  completedAt    DateTime?            @map("completed_at")
  failedAt       DateTime?            @map("failed_at")
  errorMessage   String?              @map("error_message") @db.Text

  reversedAt     DateTime?            @map("reversed_at")
  reversedById   String?              @map("reversed_by_id") @db.Uuid
  reversalReason String?              @map("reversal_reason") @db.VarChar(500)
  reversalOfId   String?              @map("reversal_of_id") @db.Uuid

  triggeredById  String?              @map("triggered_by_id") @db.Uuid
  createdAt      DateTime             @default(now()) @map("created_at")

  distributions  ProfitDistribution[]

  @@index([status])
  @@index([createdAt])
  @@map("daily_return_runs")
}

model ProfitDistribution {
  id              String         @id @default(uuid()) @db.Uuid
  runId           String         @map("run_id") @db.Uuid
  run             DailyReturnRun @relation(fields: [runId], references: [id])
  userId          String         @map("user_id") @db.Uuid
  user            User           @relation(fields: [userId], references: [id])
  walletId        String         @map("wallet_id") @db.Uuid

  eligibleBalance Decimal        @map("eligible_balance") @db.Decimal(20, 8) // base used
  returnPct       Decimal        @map("return_pct") @db.Decimal(10, 6)
  grossAmount     Decimal        @map("gross_amount") @db.Decimal(20, 8)     // before rounding
  amount          Decimal        @db.Decimal(20, 8)                          // credited (signed)
  balanceAfter    Decimal        @map("balance_after") @db.Decimal(20, 8)

  ledgerEntryId   String?        @unique @map("ledger_entry_id") @db.Uuid
  isReversed      Boolean        @default(false) @map("is_reversed")
  createdAt       DateTime       @default(now()) @map("created_at")

  @@unique([runId, userId])          // one distribution per user per run
  @@index([userId, createdAt])
  @@map("profit_distributions")
}
```

**Why `eligibleBalance` is stored:** three years from now, when a user asks "why did I earn
$7.00 on 12 August 2026?", the answer must be reconstructable without re-deriving what their
balance was that morning. Store the inputs, not just the output.

### 3.6 Notifications & communications

```prisma
model Notification {
  id        String             @id @default(uuid()) @db.Uuid
  userId    String             @map("user_id") @db.Uuid
  user      User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String             @db.VarChar(160)
  body      String             @db.VarChar(1000)
  actionUrl String?            @map("action_url") @db.VarChar(300)
  metadata  Json?
  readAt    DateTime?          @map("read_at")
  createdAt DateTime           @default(now()) @map("created_at")

  deliveries NotificationDelivery[]

  @@index([userId, readAt])
  @@index([userId, createdAt])
  @@map("notifications")
}

model NotificationDelivery {
  id             String              @id @default(uuid()) @db.Uuid
  notificationId String              @map("notification_id") @db.Uuid
  notification   Notification        @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  channel        NotificationChannel
  status         DeliveryStatus      @default(QUEUED)
  attempts       Int                 @default(0)
  lastError      String?             @map("last_error") @db.VarChar(500)
  sentAt         DateTime?           @map("sent_at")
  providerMessageId String?          @map("provider_message_id")

  @@index([status])
  @@map("notification_deliveries")
}

model NotificationPreference {
  id      String              @id @default(uuid()) @db.Uuid
  userId  String              @map("user_id") @db.Uuid
  user    User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  type    NotificationType
  channel NotificationChannel
  enabled Boolean             @default(true)

  @@unique([userId, type, channel])
  @@map("notification_preferences")
}

model EmailTemplate {
  id        String   @id @default(uuid()) @db.Uuid
  key       String   @unique @db.VarChar(60)     // 'deposit_approved'
  name      String   @db.VarChar(120)
  subject   String   @db.VarChar(200)
  bodyHtml  String   @map("body_html") @db.Text
  bodyText  String?  @map("body_text") @db.Text
  variables Json?                                 // documented placeholders
  isActive  Boolean  @default(true) @map("is_active")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("email_templates")
}

model Broadcast {
  id            String          @id @default(uuid()) @db.Uuid
  subject       String          @db.VarChar(200)
  bodyHtml      String          @map("body_html") @db.Text
  segment       Json                              // { status:'ACTIVE', minBalance:'100' }
  channels      NotificationChannel[]
  status        BroadcastStatus @default(DRAFT)
  scheduledFor  DateTime?       @map("scheduled_for")
  recipientCount Int            @default(0) @map("recipient_count")
  sentCount     Int             @default(0) @map("sent_count")
  failedCount   Int             @default(0) @map("failed_count")
  createdById   String          @map("created_by_id") @db.Uuid
  createdAt     DateTime        @default(now()) @map("created_at")
  sentAt        DateTime?       @map("sent_at")

  @@map("broadcasts")
}
```

### 3.7 Platform & audit

```prisma
model Setting {
  key         String   @id @db.VarChar(80)
  value       Json
  category    String   @db.VarChar(40)       // 'platform' | 'financial' | 'email'
  label       String   @db.VarChar(160)
  description String?  @db.VarChar(500)
  isPublic    Boolean  @default(false) @map("is_public")   // exposed to the web app
  updatedById String?  @map("updated_by_id") @db.Uuid
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("settings")
}

model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  actorId     String?  @map("actor_id") @db.Uuid
  actor       User?    @relation("ActorAuditLogs", fields: [actorId], references: [id])
  actorRole   Role?    @map("actor_role")
  action      String   @db.VarChar(80)       // 'deposit.approve'
  targetType  String?  @map("target_type") @db.VarChar(40)
  targetId    String?  @map("target_id") @db.Uuid
  before      Json?
  after       Json?
  reason      String?  @db.VarChar(500)
  ip          String?  @db.Inet
  userAgent   String?  @map("user_agent") @db.VarChar(400)
  requestId   String?  @map("request_id") @db.VarChar(60)
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([actorId, createdAt])
  @@index([action])
  @@index([targetType, targetId])
  @@index([createdAt])
  @@map("audit_logs")
}

model OutboxEvent {
  id          String       @id @default(uuid()) @db.Uuid
  eventType   String       @map("event_type") @db.VarChar(80)
  payload     Json
  status      OutboxStatus @default(PENDING)
  attempts    Int          @default(0)
  nextRetryAt DateTime?    @map("next_retry_at")
  lastError   String?      @map("last_error") @db.VarChar(500)
  createdAt   DateTime     @default(now()) @map("created_at")
  processedAt DateTime?    @map("processed_at")

  @@index([status, nextRetryAt])
  @@map("outbox_events")
}
```

---

## 4. Seeded settings

| Key | Category | Default | Effect |
|-----|----------|---------|--------|
| `platform.name` | platform | `"Meridian FX"` | Branding |
| `platform.timezone` | platform | `"UTC"` | Defines the trading-day boundary |
| `platform.maintenanceMode` | platform | `false` | Blocks non-admin access |
| `financial.returnBasis` | financial | `"BALANCE"` | Compounding vs simple — see [00 §3.3](./00-project-overview.md#33-how-the-daily-return-works) |
| `financial.minDeposit` | financial | `"50.00"` | Deposit floor |
| `financial.minWithdrawal` | financial | `"20.00"` | Withdrawal floor |
| `financial.withdrawalFeePct` | financial | `"0"` | Fee on payouts |
| `financial.withdrawalCooldownHours` | financial | `24` | Anti-abuse delay after a deposit |
| `financial.maxDailyReturnPct` | financial | `"5.0"` | Sanity cap; blocks fat-finger entry |
| `financial.allowNegativeReturns` | financial | `true` | Losing days permitted |
| `email.fromName` / `email.fromAddress` | email | — | Sender identity |
| `notifications.dailyDigestHour` | notifications | `18` | When the profit email goes out |

---

## 5. Index strategy

Beyond the declared indexes, add these once real data exists:

```sql
-- dashboard: a user's recent ledger, the hottest query in the app
CREATE INDEX idx_ledger_wallet_created ON ledger_entries (wallet_id, created_at DESC);

-- admin queues: only pending rows matter, so keep the index small
CREATE INDEX idx_deposits_pending    ON deposits (created_at DESC) WHERE status = 'PENDING';
CREATE INDEX idx_withdrawals_pending ON withdrawals (created_at DESC) WHERE status = 'PENDING';

-- trade history filtering
CREATE INDEX idx_trades_day_pair ON trades (trading_day_id, pair);

-- performance aggregation by month
CREATE INDEX idx_distributions_user_created ON profit_distributions (user_id, created_at DESC);

-- user search
CREATE INDEX idx_users_search ON users USING gin (
  to_tsvector('simple', first_name || ' ' || last_name || ' ' || email)
);
```

---

## 6. Data lifecycle

| Data | Retention | Deletion policy |
|------|-----------|-----------------|
| `LedgerEntry`, `ProfitDistribution`, `Trade`, `TradingDay`, `DailyReturnRun` | **Forever** | Never deleted. Not even on account closure |
| `AuditLog` | **Forever** | Never deleted |
| `User` | Soft delete via `deletedAt`; PII redacted on request | Financial records retained under a pseudonymous ID |
| `Session` | 30 days after expiry | Hard delete by job |
| `VerificationToken` | 7 days after expiry | Hard delete by job |
| `Notification` | 12 months | Archived then deleted |
| `OutboxEvent` | 30 days after `DONE` | Hard delete; `DEAD` retained for review |
| Deposit proofs | 7 years (typical financial record requirement) | Then deleted from storage, key nulled |

A GDPR erasure request redacts personal fields on `User` and deletes proofs, but **never** removes
ledger rows — the financial history is retained against a pseudonymised subject. This tension is
real and must be reflected in the privacy policy.

---

## 7. Migration discipline

- Migrations are **generated, reviewed and committed** — never `db push` outside local dev.
- Every migration must be tested against a production-sized copy before deployment.
- Destructive changes (drop column, narrow type) are split into expand → migrate → contract across
  two releases so a rollback never loses data.
- `prisma migrate deploy` runs in the deploy script **before** the new process starts serving.
- CI fails if the schema and migration history have drifted.
