-- Per-run success/failure counters for daily settlement
ALTER TABLE "daily_return_runs" ADD COLUMN IF NOT EXISTS "successful_wallets" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "daily_return_runs" ADD COLUMN IF NOT EXISTS "failed_wallets" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "daily_return_runs" ADD COLUMN IF NOT EXISTS "notes" VARCHAR(2000);