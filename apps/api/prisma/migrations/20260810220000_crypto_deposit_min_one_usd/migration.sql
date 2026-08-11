-- Crypto user deposits: enforce $1 minimum for OXPay gateway testing.
-- Does not modify withdrawal minimums or non-crypto (UPI/BANK/MANUAL) method mins.

UPDATE "payment_methods"
SET
  "min_amount" = 1,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "deleted_at" IS NULL
  AND (
    "type"::text = 'CRYPTO'
    OR "type"::text IN ('USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH')
  )
  AND "min_amount" <> 1;

-- Canonical crypto rails: keep the documented $250,000 ceiling.
UPDATE "payment_methods"
SET
  "max_amount" = 250000,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "deleted_at" IS NULL
  AND (
    "type"::text = 'CRYPTO'
    OR "type"::text IN ('USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH')
  )
  AND (
    lower("name") IN ('usdt trc20', 'usdt bep20', 'bitcoin', 'ethereum')
    OR "network" IN ('TRC20', 'BEP20', 'BTC', 'ETH')
    OR "id" IN (
      'b1000000-0000-4000-8000-000000000002',
      'b1000000-0000-4000-8000-000000000003',
      'b1000000-0000-4000-8000-000000000004',
      'b1000000-0000-4000-8000-000000000005'
    )
  )
  AND ("max_amount" IS DISTINCT FROM 250000);

-- Per-wallet floors on crypto methods (display only; create() uses payment_methods.min_amount).
UPDATE "wallet_addresses" wa
SET "min_amount" = 1
FROM "payment_methods" pm
WHERE wa."payment_method_id" = pm."id"
  AND wa."deleted_at" IS NULL
  AND pm."deleted_at" IS NULL
  AND (
    pm."type"::text = 'CRYPTO'
    OR pm."type"::text IN ('USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH')
  )
  AND wa."min_amount" IS NOT NULL
  AND wa."min_amount" <> 1;
