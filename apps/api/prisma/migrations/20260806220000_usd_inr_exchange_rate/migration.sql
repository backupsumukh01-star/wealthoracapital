-- Live desk USD↔INR rate on platform settings (admin-editable).
ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "usd_inr_rate" DECIMAL(20, 8) NOT NULL DEFAULT 93;

-- Snapshot INR amount alongside USD ledger amount for deposits / withdrawals.
ALTER TABLE "deposits"
  ADD COLUMN IF NOT EXISTS "amount_inr" DECIMAL(20, 8);

ALTER TABLE "withdrawals"
  ADD COLUMN IF NOT EXISTS "amount_inr" DECIMAL(20, 8);
