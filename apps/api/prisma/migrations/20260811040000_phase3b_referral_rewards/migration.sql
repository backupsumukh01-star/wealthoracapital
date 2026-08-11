-- Phase 3B: referral financial engine foundation

ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "referral_percent" DECIMAL(10,4) NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "referral_unlock_days" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS "referral_enabled" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  CREATE TYPE "ReferralRewardStatus" AS ENUM ('LOCKED', 'AVAILABLE', 'REDEEMED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "referral_rewards" (
  "id" UUID NOT NULL,
  "referrer_id" UUID NOT NULL,
  "referee_id" UUID NOT NULL,
  "source_deposit_id" UUID NOT NULL,
  "source_amount" DECIMAL(20,8) NOT NULL,
  "reward_amount" DECIMAL(20,8) NOT NULL,
  "percent_applied" DECIMAL(10,4) NOT NULL,
  "status" "ReferralRewardStatus" NOT NULL DEFAULT 'LOCKED',
  "unlock_at" TIMESTAMP(3) NOT NULL,
  "credited_transaction_id" UUID,
  "redeemed_transaction_id" UUID,
  "redeemed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "referral_rewards_source_deposit_id_key"
  ON "referral_rewards"("source_deposit_id");

CREATE UNIQUE INDEX IF NOT EXISTS "referral_rewards_redeemed_transaction_id_key"
  ON "referral_rewards"("redeemed_transaction_id");

CREATE INDEX IF NOT EXISTS "referral_rewards_referrer_id_status_idx"
  ON "referral_rewards"("referrer_id", "status");

CREATE INDEX IF NOT EXISTS "referral_rewards_unlock_at_status_idx"
  ON "referral_rewards"("unlock_at", "status");

DO $$ BEGIN
  ALTER TABLE "referral_rewards"
    ADD CONSTRAINT "referral_rewards_referrer_id_fkey"
    FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "referral_rewards"
    ADD CONSTRAINT "referral_rewards_referee_id_fkey"
    FOREIGN KEY ("referee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "referral_rewards"
    ADD CONSTRAINT "referral_rewards_source_deposit_id_fkey"
    FOREIGN KEY ("source_deposit_id") REFERENCES "deposits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "referral_rewards"
    ADD CONSTRAINT "referral_rewards_credited_transaction_id_fkey"
    FOREIGN KEY ("credited_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "referral_rewards"
    ADD CONSTRAINT "referral_rewards_redeemed_transaction_id_fkey"
    FOREIGN KEY ("redeemed_transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
