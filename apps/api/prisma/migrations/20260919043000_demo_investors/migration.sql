-- Admin-created (demo) investors. Additive. Backfills existing Create-user accounts.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_by_admin_id" UUID;

CREATE INDEX IF NOT EXISTS "users_created_by_admin_id_idx" ON "users"("created_by_admin_id");

UPDATE "users" AS u
SET "created_by_admin_id" = a."actor_id"
FROM "activity_logs" AS a
WHERE a."user_id" = u."id"
  AND a."actor_id" IS NOT NULL
  AND a."title" IN (
    'KYC skipped — account created by admin',
    'Account created by admin'
  )
  AND u."created_by_admin_id" IS NULL
  AND u."role" = 'USER';

UPDATE "activity_logs"
SET "title" = 'KYC approved'
WHERE "title" = 'KYC skipped — account created by admin';

UPDATE "activity_logs"
SET "title" = 'Account created'
WHERE "title" = 'Account created by admin';

UPDATE "activity_logs"
SET
  "kind" = 'DEPOSIT_APPROVED',
  "title" = 'Deposit confirmed by provider'
WHERE "title" = 'Historical deposit recorded';

UPDATE "activity_logs"
SET
  "kind" = 'WITHDRAWAL_PAID',
  "title" = 'Withdrawal paid'
WHERE "title" = 'Historical withdrawal recorded';

UPDATE "activity_logs"
SET
  "kind" = 'DAILY_RETURN_APPLIED',
  "title" = 'Daily profit credited'
WHERE "title" = 'Historical profit recorded';

UPDATE "activity_logs"
SET
  "kind" = 'WALLET_ADJUSTMENT',
  "title" = 'Referral bonus credited'
WHERE "title" = 'Historical referral recorded';

UPDATE "activity_logs" AS a
SET "description" = d."reference"
FROM "deposits" AS d
WHERE a."user_id" = d."user_id"
  AND a."title" = 'Deposit confirmed by provider'
  AND d."reference" LIKE 'DEP-%'
  AND COALESCE(d."submission_details"->>'historical', '') = 'true'
  AND (a."description" IS NULL OR a."description" = '');

UPDATE "activity_logs" AS a
SET "description" = w."reference"
FROM "withdrawals" AS w
WHERE a."user_id" = w."user_id"
  AND a."title" = 'Withdrawal paid'
  AND w."reference" LIKE 'WD-%'
  AND COALESCE(w."destination_snapshot"->>'historical', '') = 'true'
  AND (a."description" IS NULL OR a."description" = '');
