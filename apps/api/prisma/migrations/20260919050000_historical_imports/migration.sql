-- Additive audit table for admin historical spreadsheet imports. No ledger changes.

CREATE TYPE "HistoricalImportStatus" AS ENUM ('PREVIEW', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "historical_imports" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(32) NOT NULL,
    "user_id" UUID NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "file_name" VARCHAR(200) NOT NULL,
    "file_sha256" VARCHAR(64) NOT NULL,
    "status" "HistoricalImportStatus" NOT NULL DEFAULT 'PREVIEW',
    "row_count" INTEGER NOT NULL,
    "valid_count" INTEGER NOT NULL,
    "invalid_count" INTEGER NOT NULL,
    "skipped_count" INTEGER NOT NULL,
    "imported_count" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB NOT NULL,
    "preview" JSONB NOT NULL,
    "error_message" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "historical_imports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "historical_imports_reference_key" ON "historical_imports"("reference");
CREATE INDEX "historical_imports_user_id_created_at_idx" ON "historical_imports"("user_id", "created_at");
CREATE INDEX "historical_imports_uploaded_by_id_created_at_idx" ON "historical_imports"("uploaded_by_id", "created_at");

ALTER TABLE "historical_imports" ADD CONSTRAINT "historical_imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "historical_imports" ADD CONSTRAINT "historical_imports_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
