-- Phase 1A: multi-currency display rates, user display preference, per-deposit lock
ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "currency_rates" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "display_currency" CHAR(3) NOT NULL DEFAULT 'USD';

ALTER TABLE "deposits"
  ADD COLUMN IF NOT EXISTS "lock_days" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "deposits"
  ADD COLUMN IF NOT EXISTS "funds_unlock_at" TIMESTAMP(3);

-- Seed currency_rates from existing usd_inr_rate where empty
UPDATE "platform_settings"
SET "currency_rates" = jsonb_build_object(
  'USD', '1',
  'INR', TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM "usd_inr_rate"::text)),
  'EUR', '0.92',
  'GBP', '0.79',
  'JPY', '150',
  'CAD', '1.36',
  'AUD', '1.52',
  'AED', '3.67',
  'SGD', '1.34'
)
WHERE "currency_rates" = '{}'::jsonb OR "currency_rates" IS NULL;

CREATE INDEX IF NOT EXISTS "deposits_user_id_funds_unlock_at_idx"
  ON "deposits" ("user_id", "funds_unlock_at");
