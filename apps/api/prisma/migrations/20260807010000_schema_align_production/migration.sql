-- Align live DB with Prisma schema (pre-launch verification).
-- 1) Drop orphan oauth_accounts (unused; Google OAuth uses users.google_id).
-- 2) Restore non-unique (date, return_basis) index after unique key was removed.
-- 3) Drop legacy single-column wallet_addresses index superseded by composite index.

DROP TABLE IF EXISTS "oauth_accounts";

CREATE INDEX IF NOT EXISTS "daily_return_runs_date_return_basis_idx"
  ON "daily_return_runs"("date", "return_basis");

CREATE INDEX IF NOT EXISTS "wallet_addresses_payment_method_id_sort_order_idx"
  ON "wallet_addresses"("payment_method_id", "sort_order");

DROP INDEX IF EXISTS "wallet_addresses_payment_method_id_idx";
