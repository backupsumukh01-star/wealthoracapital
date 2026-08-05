-- Financial critical fixes: distribution uniqueness, invested non-negative, wallet equality hint.

-- C2: prevent two distribution runs for the same date + return basis (different idempotency keys).
-- Deduplicate any legacy rows before adding the unique constraint (keep oldest COMPLETED, else oldest).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "date", "return_basis"
      ORDER BY
        CASE "status"
          WHEN 'COMPLETED' THEN 0
          WHEN 'PROCESSING' THEN 1
          WHEN 'FAILED' THEN 2
          ELSE 3
        END,
        "created_at" ASC
    ) AS rn
  FROM "daily_return_runs"
)
DELETE FROM "daily_return_runs"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX "daily_return_runs_date_return_basis_key"
  ON "daily_return_runs"("date", "return_basis");

-- C3 support: invested_amount must never go negative.
ALTER TABLE "wallets"
  DROP CONSTRAINT IF EXISTS "wallets_non_negative_balance";

ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_non_negative_balance" CHECK (
    "balance" >= 0
    AND "locked_balance" >= 0
    AND "available_balance" >= 0
    AND "pending_balance" >= 0
    AND "invested_amount" >= 0
  );
