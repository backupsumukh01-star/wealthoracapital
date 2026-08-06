-- Normalize deposit / payment methods schema (enum + tables). Data backfill is a follow-up migration.

ALTER TYPE "PaymentMethodType" ADD VALUE IF NOT EXISTS 'UPI';

ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "logo_key" VARCHAR(400);

CREATE TABLE IF NOT EXISTS "payment_method_upi_details" (
    "payment_method_id" UUID NOT NULL,
    "upi_id" VARCHAR(120) NOT NULL,
    "account_holder_name" VARCHAR(120) NOT NULL,
    "qr_code_key" VARCHAR(400),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_method_upi_details_pkey" PRIMARY KEY ("payment_method_id")
);

CREATE TABLE IF NOT EXISTS "payment_method_bank_details" (
    "payment_method_id" UUID NOT NULL,
    "account_holder_name" VARCHAR(120) NOT NULL,
    "bank_name" VARCHAR(120) NOT NULL,
    "account_number" VARCHAR(64) NOT NULL,
    "ifsc_code" VARCHAR(32) NOT NULL,
    "branch" VARCHAR(120),
    "account_type" VARCHAR(40),
    "qr_code_key" VARCHAR(400),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_method_bank_details_pkey" PRIMARY KEY ("payment_method_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_method_upi_details_payment_method_id_fkey'
  ) THEN
    ALTER TABLE "payment_method_upi_details"
      ADD CONSTRAINT "payment_method_upi_details_payment_method_id_fkey"
      FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_method_bank_details_payment_method_id_fkey'
  ) THEN
    ALTER TABLE "payment_method_bank_details"
      ADD CONSTRAINT "payment_method_bank_details_payment_method_id_fkey"
      FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "wallet_addresses" ADD COLUMN IF NOT EXISTS "coin" VARCHAR(20) NOT NULL DEFAULT 'USDT';
ALTER TABLE "wallet_addresses" ADD COLUMN IF NOT EXISTS "instructions" VARCHAR(2000);
ALTER TABLE "wallet_addresses" ADD COLUMN IF NOT EXISTS "min_amount" DECIMAL(20,8);
ALTER TABLE "wallet_addresses" ADD COLUMN IF NOT EXISTS "max_amount" DECIMAL(20,8);
ALTER TABLE "wallet_addresses" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 100;

CREATE INDEX IF NOT EXISTS "wallet_addresses_coin_network_is_active_idx"
  ON "wallet_addresses"("coin", "network", "is_active");
CREATE INDEX IF NOT EXISTS "wallet_addresses_payment_method_id_sort_order_idx"
  ON "wallet_addresses"("payment_method_id", "sort_order");
