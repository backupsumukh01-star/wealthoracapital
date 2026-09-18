-- Sales Portal foundation: isolated salesman identity, sessions, and first-touch attribution.
-- Additive only. Does not ALTER users, deposits, withdrawals, wallets, referral_rewards, or ledger tables.
-- Does not backfill existing investors.

DO $$ BEGIN
  CREATE TYPE "SalesmanStatus" AS ENUM ('ACTIVE', 'DISABLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "SalesAttributionSource" AS ENUM ('SALESMAN_LINK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "salesmen" (
  "id" UUID NOT NULL,
  "email" CITEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "code" VARCHAR(16) NOT NULL,
  "status" "SalesmanStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_by_admin_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "salesmen_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "salesmen_email_key" ON "salesmen"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "salesmen_code_key" ON "salesmen"("code");
CREATE INDEX IF NOT EXISTS "salesmen_status_idx" ON "salesmen"("status");

CREATE TABLE IF NOT EXISTS "salesman_sessions" (
  "id" UUID NOT NULL,
  "salesman_id" UUID NOT NULL,
  "refresh_token_hash" TEXT NOT NULL,
  "family_id" UUID NOT NULL,
  "user_agent" VARCHAR(400),
  "ip" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "replaced_by_id" UUID,
  "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "salesman_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "salesman_sessions_refresh_token_hash_key"
  ON "salesman_sessions"("refresh_token_hash");
CREATE INDEX IF NOT EXISTS "salesman_sessions_salesman_id_idx" ON "salesman_sessions"("salesman_id");
CREATE INDEX IF NOT EXISTS "salesman_sessions_family_id_idx" ON "salesman_sessions"("family_id");
CREATE INDEX IF NOT EXISTS "salesman_sessions_expires_at_idx" ON "salesman_sessions"("expires_at");

CREATE TABLE IF NOT EXISTS "sales_attributions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "salesman_id" UUID NOT NULL,
  "source" "SalesAttributionSource" NOT NULL DEFAULT 'SALESMAN_LINK',
  "attributed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sales_attributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sales_attributions_user_id_key" ON "sales_attributions"("user_id");
CREATE INDEX IF NOT EXISTS "sales_attributions_salesman_id_idx" ON "sales_attributions"("salesman_id");
CREATE INDEX IF NOT EXISTS "sales_attributions_salesman_id_attributed_at_idx"
  ON "sales_attributions"("salesman_id", "attributed_at");

DO $$ BEGIN
  ALTER TABLE "salesman_sessions"
    ADD CONSTRAINT "salesman_sessions_salesman_id_fkey"
    FOREIGN KEY ("salesman_id") REFERENCES "salesmen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "sales_attributions"
    ADD CONSTRAINT "sales_attributions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "sales_attributions"
    ADD CONSTRAINT "sales_attributions_salesman_id_fkey"
    FOREIGN KEY ("salesman_id") REFERENCES "salesmen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
