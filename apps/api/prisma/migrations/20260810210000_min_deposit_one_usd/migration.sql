-- Lower platform + payment-method deposit floors to $1 for gateway testing.
-- Does not touch withdrawal minimums or historical deposit/ledger amounts.

ALTER TABLE "payment_methods" ALTER COLUMN "min_amount" SET DEFAULT 1;
UPDATE "payment_methods" SET "min_amount" = 1 WHERE "min_amount" > 1;

ALTER TABLE "platform_settings" ALTER COLUMN "min_deposit" SET DEFAULT 1;
UPDATE "platform_settings" SET "min_deposit" = 1 WHERE "min_deposit" > 1;

-- Optional per-wallet floors shown on crypto methods (not a second create() gate,
-- but keep display consistent with the $1 platform minimum).
UPDATE "wallet_addresses" SET "min_amount" = 1 WHERE "min_amount" IS NOT NULL AND "min_amount" > 1;
