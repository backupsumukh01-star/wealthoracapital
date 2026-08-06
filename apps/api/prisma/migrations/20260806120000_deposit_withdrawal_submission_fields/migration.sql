-- Deposit investor submission fields
ALTER TABLE "deposits" ADD COLUMN IF NOT EXISTS "notes" VARCHAR(2000);
ALTER TABLE "deposits" ADD COLUMN IF NOT EXISTS "submission_details" JSONB;

-- Withdrawal OTP verification marker
ALTER TABLE "withdrawals" ADD COLUMN IF NOT EXISTS "otp_verified_at" TIMESTAMP(3);

-- Unique phone among active (non-deleted) users
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_active_unique"
  ON "users" ("phone")
  WHERE "phone" IS NOT NULL AND "deleted_at" IS NULL;
