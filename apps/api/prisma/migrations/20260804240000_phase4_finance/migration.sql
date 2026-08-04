-- Phase 4: Wallet, double-entry ledger, deposits, withdrawals, finance admin

CREATE TYPE "NotificationKind_new" AS ENUM ('SYSTEM', 'SECURITY', 'ACCOUNT', 'ADMIN', 'FINANCE');
ALTER TABLE "notifications" ALTER COLUMN "kind" DROP DEFAULT;
ALTER TABLE "notifications" ALTER COLUMN "kind" TYPE "NotificationKind_new" USING ("kind"::text::"NotificationKind_new");
ALTER TYPE "NotificationKind" RENAME TO "NotificationKind_old";
ALTER TYPE "NotificationKind_new" RENAME TO "NotificationKind";
DROP TYPE "NotificationKind_old";
ALTER TABLE "notifications" ALTER COLUMN "kind" SET DEFAULT 'SYSTEM';

ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'DEPOSIT_SUBMITTED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'DEPOSIT_APPROVED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'DEPOSIT_REJECTED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'DEPOSIT_CANCELLED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'WITHDRAWAL_SUBMITTED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'WITHDRAWAL_APPROVED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'WITHDRAWAL_REJECTED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'WITHDRAWAL_CANCELLED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'WITHDRAWAL_PAID';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'WALLET_ADJUSTMENT';

CREATE TYPE "WalletKind" AS ENUM ('INVESTMENT', 'PROFIT', 'BONUS', 'REFERRAL');
CREATE TYPE "LedgerAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CONTRA');
CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'INVESTMENT', 'PROFIT', 'REFERRAL_BONUS', 'ADMIN_ADJUSTMENT', 'TRANSFER', 'REFUND', 'REVERSAL');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'POSTED', 'REVERSED', 'CANCELLED', 'FAILED');
CREATE TYPE "LedgerEntryType" AS ENUM ('DEPOSIT_APPROVED', 'WITHDRAWAL_LOCKED', 'WITHDRAWAL_COMPLETED', 'WITHDRAWAL_REFUNDED', 'PROFIT_DISTRIBUTION', 'PROFIT_REVERSAL', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT', 'FEE', 'BONUS', 'TRANSFER', 'REFUND', 'REVERSAL');
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'PAID', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE "PaymentMethodType" AS ENUM ('BANK_TRANSFER', 'USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH', 'MANUAL', 'CRYPTO', 'MOBILE_WALLET', 'OTHER');
CREATE TYPE "ApprovalQueueStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED', 'ESCALATED');
CREATE TYPE "ApprovalRole" AS ENUM ('FINANCE', 'ADMIN', 'SUPERVISOR');
CREATE TYPE "FinanceReviewDecision" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_INFORMATION', 'FORCE_COMPLETE', 'FORCE_CANCEL', 'NOTE', 'PAID');

CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "WalletKind" NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "available_balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "locked_balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "pending_balance" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "invested_amount" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "total_profit" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "total_deposited" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "total_withdrawn" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "wallets_non_negative_balance" CHECK ("balance" >= 0 AND "locked_balance" >= 0 AND "available_balance" >= 0 AND "pending_balance" >= 0),
    CONSTRAINT "wallets_locked_lte_balance" CHECK ("locked_balance" <= "balance")
);

CREATE TABLE "ledger_accounts" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "account_type" "LedgerAccountType" NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "user_id" UUID,
    "wallet_id" UUID,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "reference_id" VARCHAR(32) NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(20,8) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "description" VARCHAR(500),
    "idempotency_key" VARCHAR(120),
    "created_by_id" UUID,
    "audit_ref" VARCHAR(80),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "posted_at" TIMESTAMP(3),
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "wallet_id" UUID,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "signed_amount" DECIMAL(20,8) NOT NULL,
    "entry_type" "LedgerEntryType" NOT NULL,
    "balance_before" DECIMAL(20,8),
    "balance_after" DECIMAL(20,8),
    "description" VARCHAR(500),
    "reference_type" VARCHAR(40),
    "reference_id" UUID,
    "idempotency_key" VARCHAR(160),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ledger_entries_amount_positive" CHECK ("amount" > 0)
);

CREATE TABLE "payment_methods" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "instructions" VARCHAR(2000) NOT NULL,
    "account_details" JSONB NOT NULL DEFAULT '{}',
    "network" VARCHAR(40),
    "min_amount" DECIMAL(20,8) NOT NULL DEFAULT 50,
    "max_amount" DECIMAL(20,8),
    "fee_pct" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "processing_time" VARCHAR(80),
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallet_addresses" (
    "id" UUID NOT NULL,
    "payment_method_id" UUID,
    "label" VARCHAR(80) NOT NULL,
    "network" VARCHAR(40) NOT NULL,
    "address" VARCHAR(200) NOT NULL,
    "memo" VARCHAR(120),
    "qr_code_key" VARCHAR(400),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "wallet_addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payout_methods" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "masked_details" VARCHAR(160) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payout_methods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deposits" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(32) NOT NULL,
    "user_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "payment_method_id" UUID NOT NULL,
    "transaction_id" UUID,
    "amount" DECIMAL(20,8) NOT NULL,
    "fee" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "credited_amount" DECIMAL(20,8),
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "user_reference" VARCHAR(120),
    "tx_hash" VARCHAR(120),
    "proof_key" VARCHAR(400),
    "proof_checksum" VARCHAR(64),
    "rejection_reason" VARCHAR(500),
    "internal_notes" VARCHAR(2000),
    "idempotency_key" VARCHAR(120) NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "deposits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "withdrawals" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(32) NOT NULL,
    "user_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "payout_method_id" UUID NOT NULL,
    "transaction_id" UUID,
    "amount" DECIMAL(20,8) NOT NULL,
    "fee" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(20,8) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "destination_label" VARCHAR(160) NOT NULL,
    "destination_snapshot" JSONB NOT NULL,
    "transaction_ref" VARCHAR(120),
    "rejection_reason" VARCHAR(500),
    "internal_notes" VARCHAR(2000),
    "idempotency_key" VARCHAR(120) NOT NULL,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "approval_queue" (
    "id" UUID NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" UUID NOT NULL,
    "deposit_id" UUID,
    "withdrawal_id" UUID,
    "status" "ApprovalQueueStatus" NOT NULL DEFAULT 'PENDING',
    "required_role" "ApprovalRole" NOT NULL DEFAULT 'FINANCE',
    "assignee_id" UUID,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    CONSTRAINT "approval_queue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_reviews" (
    "id" UUID NOT NULL,
    "deposit_id" UUID,
    "withdrawal_id" UUID,
    "reviewer_id" UUID,
    "decision" "FinanceReviewDecision" NOT NULL,
    "reason" VARCHAR(1000),
    "internal_notes" VARCHAR(2000),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "finance_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transaction_histories" (
    "id" UUID NOT NULL,
    "transaction_id" UUID,
    "user_id" UUID NOT NULL,
    "event" VARCHAR(80) NOT NULL,
    "status" VARCHAR(40),
    "amount" DECIMAL(20,8),
    "currency" CHAR(3),
    "message" VARCHAR(500),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transaction_histories_pkey" PRIMARY KEY ("id")
);

-- Indexes & uniques
CREATE UNIQUE INDEX "wallets_user_id_kind_key" ON "wallets"("user_id", "kind");
CREATE INDEX "wallets_user_id_idx" ON "wallets"("user_id");

CREATE UNIQUE INDEX "ledger_accounts_code_key" ON "ledger_accounts"("code");
CREATE INDEX "ledger_accounts_user_id_idx" ON "ledger_accounts"("user_id");
CREATE INDEX "ledger_accounts_wallet_id_idx" ON "ledger_accounts"("wallet_id");

CREATE UNIQUE INDEX "transactions_reference_id_key" ON "transactions"("reference_id");
CREATE UNIQUE INDEX "transactions_idempotency_key_key" ON "transactions"("idempotency_key");
CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at");
CREATE INDEX "transactions_type_status_idx" ON "transactions"("type", "status");
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

CREATE UNIQUE INDEX "ledger_entries_idempotency_key_key" ON "ledger_entries"("idempotency_key");
CREATE INDEX "ledger_entries_transaction_id_idx" ON "ledger_entries"("transaction_id");
CREATE INDEX "ledger_entries_account_id_idx" ON "ledger_entries"("account_id");
CREATE INDEX "ledger_entries_wallet_id_created_at_idx" ON "ledger_entries"("wallet_id", "created_at");
CREATE INDEX "ledger_entries_reference_type_reference_id_idx" ON "ledger_entries"("reference_type", "reference_id");
CREATE INDEX "ledger_entries_created_at_idx" ON "ledger_entries"("created_at");

CREATE INDEX "payment_methods_is_active_priority_idx" ON "payment_methods"("is_active", "priority");
CREATE INDEX "payment_methods_type_idx" ON "payment_methods"("type");

CREATE INDEX "wallet_addresses_network_is_active_idx" ON "wallet_addresses"("network", "is_active");
CREATE INDEX "wallet_addresses_payment_method_id_idx" ON "wallet_addresses"("payment_method_id");

CREATE INDEX "payout_methods_user_id_idx" ON "payout_methods"("user_id");

CREATE UNIQUE INDEX "deposits_reference_key" ON "deposits"("reference");
CREATE UNIQUE INDEX "deposits_transaction_id_key" ON "deposits"("transaction_id");
CREATE UNIQUE INDEX "deposits_idempotency_key_key" ON "deposits"("idempotency_key");
CREATE UNIQUE INDEX "deposits_tx_hash_key" ON "deposits"("tx_hash");
CREATE INDEX "deposits_user_id_status_idx" ON "deposits"("user_id", "status");
CREATE INDEX "deposits_status_created_at_idx" ON "deposits"("status", "created_at");
CREATE INDEX "deposits_proof_checksum_idx" ON "deposits"("proof_checksum");

CREATE UNIQUE INDEX "withdrawals_reference_key" ON "withdrawals"("reference");
CREATE UNIQUE INDEX "withdrawals_transaction_id_key" ON "withdrawals"("transaction_id");
CREATE UNIQUE INDEX "withdrawals_idempotency_key_key" ON "withdrawals"("idempotency_key");
CREATE INDEX "withdrawals_user_id_status_idx" ON "withdrawals"("user_id", "status");
CREATE INDEX "withdrawals_status_created_at_idx" ON "withdrawals"("status", "created_at");

CREATE UNIQUE INDEX "approval_queue_deposit_id_key" ON "approval_queue"("deposit_id");
CREATE UNIQUE INDEX "approval_queue_withdrawal_id_key" ON "approval_queue"("withdrawal_id");
CREATE INDEX "approval_queue_status_priority_created_at_idx" ON "approval_queue"("status", "priority", "created_at");
CREATE INDEX "approval_queue_entity_type_entity_id_idx" ON "approval_queue"("entity_type", "entity_id");

CREATE INDEX "finance_reviews_deposit_id_created_at_idx" ON "finance_reviews"("deposit_id", "created_at");
CREATE INDEX "finance_reviews_withdrawal_id_created_at_idx" ON "finance_reviews"("withdrawal_id", "created_at");
CREATE INDEX "finance_reviews_reviewer_id_idx" ON "finance_reviews"("reviewer_id");

CREATE INDEX "transaction_histories_user_id_created_at_idx" ON "transaction_histories"("user_id", "created_at");
CREATE INDEX "transaction_histories_transaction_id_idx" ON "transaction_histories"("transaction_id");

-- FKs
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "wallet_addresses" ADD CONSTRAINT "wallet_addresses_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payout_methods" ADD CONSTRAINT "payout_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_payout_method_id_fkey" FOREIGN KEY ("payout_method_id") REFERENCES "payout_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_deposit_id_fkey" FOREIGN KEY ("deposit_id") REFERENCES "deposits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "withdrawals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_queue" ADD CONSTRAINT "approval_queue_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "finance_reviews" ADD CONSTRAINT "finance_reviews_deposit_id_fkey" FOREIGN KEY ("deposit_id") REFERENCES "deposits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_reviews" ADD CONSTRAINT "finance_reviews_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "withdrawals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_reviews" ADD CONSTRAINT "finance_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transaction_histories" ADD CONSTRAINT "transaction_histories_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Immutable ledger trigger
CREATE OR REPLACE FUNCTION forbid_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Ledger entries are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_no_update
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_mutation();

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- System ledger accounts
INSERT INTO "ledger_accounts" ("id", "code", "name", "account_type", "currency", "is_system", "created_at")
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'SYS:CLEARING', 'Platform Clearing', 'ASSET', 'USD', true, CURRENT_TIMESTAMP),
  ('a1000000-0000-4000-8000-000000000002', 'SYS:PAYOUT', 'Platform Payouts', 'LIABILITY', 'USD', true, CURRENT_TIMESTAMP),
  ('a1000000-0000-4000-8000-000000000003', 'SYS:FEES', 'Platform Fees', 'REVENUE', 'USD', true, CURRENT_TIMESTAMP),
  ('a1000000-0000-4000-8000-000000000004', 'SYS:SUSPENSE', 'Suspense', 'LIABILITY', 'USD', true, CURRENT_TIMESTAMP);

-- Seed payment methods
INSERT INTO "payment_methods" ("id", "name", "type", "instructions", "account_details", "network", "min_amount", "max_amount", "fee_pct", "processing_time", "priority", "is_active", "created_at", "updated_at")
VALUES
  ('b1000000-0000-4000-8000-000000000001', 'Bank Transfer', 'BANK_TRANSFER', 'Transfer to the company bank account and upload proof.', '{"bankName":"Growzy Treasury","accountName":"Growzy Capital Ltd","accountNumber":"00000000","routingNumber":"000000000"}', NULL, 50, 100000, 0, '1-2 business days', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('b1000000-0000-4000-8000-000000000002', 'USDT TRC20', 'USDT_TRC20', 'Send USDT on TRON (TRC20) to the address shown. Include your deposit reference in the memo if supported.', '{"asset":"USDT","network":"TRC20"}', 'TRC20', 50, 250000, 0, '15-60 minutes', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('b1000000-0000-4000-8000-000000000003', 'USDT BEP20', 'USDT_BEP20', 'Send USDT on BNB Smart Chain (BEP20) to the address shown.', '{"asset":"USDT","network":"BEP20"}', 'BEP20', 50, 250000, 0, '15-60 minutes', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('b1000000-0000-4000-8000-000000000004', 'Bitcoin', 'BTC', 'Send BTC to the platform wallet address. Network fees are paid by the sender.', '{"asset":"BTC","network":"BTC"}', 'BTC', 100, 500000, 0, '30-120 minutes', 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('b1000000-0000-4000-8000-000000000005', 'Ethereum', 'ETH', 'Send ETH on Ethereum mainnet to the platform wallet address.', '{"asset":"ETH","network":"ETH"}', 'ETH', 100, 500000, 0, '15-60 minutes', 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('b1000000-0000-4000-8000-000000000006', 'Manual / Offline', 'MANUAL', 'Contact finance for an offline settlement. An agent will provide instructions.', '{"channel":"manual"}', NULL, 50, NULL, 0, '1-3 business days', 90, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
