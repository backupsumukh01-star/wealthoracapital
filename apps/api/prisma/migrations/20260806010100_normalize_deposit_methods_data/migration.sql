-- Backfill normalized UPI/bank/crypto rows after UPI enum value is committed.

INSERT INTO "payment_method_upi_details" (
  "payment_method_id", "upi_id", "account_holder_name", "qr_code_key", "created_at", "updated_at"
)
SELECT
  pm.id,
  COALESCE(
    NULLIF(pm.account_details->>'upiId', ''),
    NULLIF(pm.account_details->>'upi', ''),
    NULLIF(pm.account_details->>'vpa', ''),
    'unknown@upi'
  ),
  COALESCE(
    NULLIF(pm.account_details->>'accountHolderName', ''),
    NULLIF(pm.account_details->>'accountName', ''),
    NULLIF(pm.account_details->>'accountHolder', ''),
    NULLIF(pm.account_details->>'beneficiary', ''),
    pm.name
  ),
  NULLIF(COALESCE(pm.account_details->>'qrCodeKey', pm.account_details->>'qrKey'), ''),
  NOW(),
  NOW()
FROM "payment_methods" pm
WHERE pm.deleted_at IS NULL
  AND (
    pm.type::text = 'MOBILE_WALLET'
    OR COALESCE(pm.account_details->>'upiId', pm.account_details->>'upi', pm.account_details->>'vpa', '') <> ''
  )
  AND NOT EXISTS (
    SELECT 1 FROM "payment_method_upi_details" u WHERE u.payment_method_id = pm.id
  );

UPDATE "payment_methods" pm
SET type = 'UPI'
WHERE pm.deleted_at IS NULL
  AND pm.type::text = 'MOBILE_WALLET'
  AND EXISTS (SELECT 1 FROM "payment_method_upi_details" u WHERE u.payment_method_id = pm.id);

INSERT INTO "payment_method_bank_details" (
  "payment_method_id", "account_holder_name", "bank_name", "account_number", "ifsc_code",
  "branch", "account_type", "qr_code_key", "created_at", "updated_at"
)
SELECT
  pm.id,
  COALESCE(
    NULLIF(pm.account_details->>'accountHolderName', ''),
    NULLIF(pm.account_details->>'accountName', ''),
    NULLIF(pm.account_details->>'accountHolder', ''),
    NULLIF(pm.account_details->>'beneficiary', ''),
    pm.name
  ),
  COALESCE(NULLIF(pm.account_details->>'bankName', ''), NULLIF(pm.account_details->>'bank', ''), 'Bank'),
  COALESCE(NULLIF(pm.account_details->>'accountNumber', ''), NULLIF(pm.account_details->>'account', ''), '0000000000'),
  COALESCE(NULLIF(pm.account_details->>'ifscCode', ''), NULLIF(pm.account_details->>'ifsc', ''), NULLIF(pm.account_details->>'routingNumber', ''), 'XXXX0000000'),
  NULLIF(pm.account_details->>'branch', ''),
  NULLIF(pm.account_details->>'accountType', ''),
  NULLIF(COALESCE(pm.account_details->>'qrCodeKey', pm.account_details->>'qrKey'), ''),
  NOW(),
  NOW()
FROM "payment_methods" pm
WHERE pm.deleted_at IS NULL
  AND pm.type::text = 'BANK_TRANSFER'
  AND NOT EXISTS (
    SELECT 1 FROM "payment_method_bank_details" b WHERE b.payment_method_id = pm.id
  )
  AND (
    COALESCE(pm.account_details->>'accountNumber', pm.account_details->>'account', '') <> ''
    OR COALESCE(pm.account_details->>'ifsc', pm.account_details->>'ifscCode', '') <> ''
    OR COALESCE(pm.account_details->>'bankName', pm.account_details->>'bank', '') <> ''
  );

UPDATE "wallet_addresses" wa
SET coin = CASE
  WHEN UPPER(wa.network) LIKE '%BTC%' THEN 'BTC'
  WHEN UPPER(wa.network) LIKE '%ETH%' OR UPPER(wa.network) IN ('ERC20', 'ARBITRUM', 'OPTIMISM', 'POLYGON') THEN 'ETH'
  WHEN UPPER(wa.network) LIKE '%SOL%' THEN 'SOL'
  WHEN UPPER(wa.network) LIKE '%TRX%' OR UPPER(wa.network) = 'TRC20' THEN 'USDT'
  WHEN UPPER(wa.network) IN ('BEP20', 'BSC') THEN 'USDT'
  ELSE 'USDT'
END
WHERE wa.coin IS NULL OR wa.coin = 'USDT';

UPDATE "wallet_addresses" wa
SET coin = CASE pm.type::text
  WHEN 'BTC' THEN 'BTC'
  WHEN 'ETH' THEN 'ETH'
  WHEN 'USDT_TRC20' THEN 'USDT'
  WHEN 'USDT_BEP20' THEN 'USDT'
  ELSE wa.coin
END
FROM "payment_methods" pm
WHERE wa.payment_method_id = pm.id
  AND pm.type::text IN ('BTC', 'ETH', 'USDT_TRC20', 'USDT_BEP20');

INSERT INTO "wallet_addresses" (
  "id", "payment_method_id", "label", "coin", "network", "address", "memo", "qr_code_key",
  "is_default", "is_active", "sort_order", "created_at", "updated_at"
)
SELECT
  gen_random_uuid(),
  pm.id,
  pm.name,
  CASE pm.type::text
    WHEN 'BTC' THEN 'BTC'
    WHEN 'ETH' THEN 'ETH'
    ELSE 'USDT'
  END,
  COALESCE(
    NULLIF(pm.network, ''),
    CASE pm.type::text
      WHEN 'USDT_TRC20' THEN 'TRC20'
      WHEN 'USDT_BEP20' THEN 'BEP20'
      WHEN 'BTC' THEN 'BTC'
      WHEN 'ETH' THEN 'ERC20'
      ELSE 'TRC20'
    END
  ),
  COALESCE(
    NULLIF(pm.account_details->>'address', ''),
    NULLIF(pm.account_details->>'walletAddress', ''),
    NULLIF(pm.account_details->>'depositAddress', ''),
    'PENDING_ADDRESS'
  ),
  NULLIF(pm.account_details->>'memo', ''),
  NULLIF(COALESCE(pm.account_details->>'qrCodeKey', pm.account_details->>'qrKey'), ''),
  true,
  pm.is_active,
  100,
  NOW(),
  NOW()
FROM "payment_methods" pm
WHERE pm.deleted_at IS NULL
  AND pm.type::text IN ('USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH')
  AND NOT EXISTS (
    SELECT 1 FROM "wallet_addresses" wa
    WHERE wa.payment_method_id = pm.id AND wa.deleted_at IS NULL
  );

UPDATE "payment_methods"
SET type = 'CRYPTO'
WHERE deleted_at IS NULL
  AND type::text IN ('USDT_TRC20', 'USDT_BEP20', 'BTC', 'ETH');
