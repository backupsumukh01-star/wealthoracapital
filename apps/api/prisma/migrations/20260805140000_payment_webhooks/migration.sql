-- Production payment webhooks + reconciliation

ALTER TYPE "FinanceReviewDecision" ADD VALUE 'PROVIDER_CONFIRM';

CREATE TYPE "PaymentWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED', 'DUPLICATE');

CREATE TABLE "payment_webhook_events" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "event_id" VARCHAR(160) NOT NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "signature" VARCHAR(256),
    "payload" JSONB NOT NULL,
    "status" "PaymentWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "deposit_id" UUID,
    "withdrawal_id" UUID,
    "error_message" VARCHAR(1000),
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_webhook_events_provider_event_id_key" ON "payment_webhook_events"("provider", "event_id");
CREATE INDEX "payment_webhook_events_status_created_at_idx" ON "payment_webhook_events"("status", "created_at");
CREATE INDEX "payment_webhook_events_event_type_created_at_idx" ON "payment_webhook_events"("event_type", "created_at");
CREATE INDEX "payment_webhook_events_deposit_id_idx" ON "payment_webhook_events"("deposit_id");
CREATE INDEX "payment_webhook_events_withdrawal_id_idx" ON "payment_webhook_events"("withdrawal_id");

ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_deposit_id_fkey" FOREIGN KEY ("deposit_id") REFERENCES "deposits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "withdrawals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "reconciliation_runs" (
    "id" UUID NOT NULL,
    "status" VARCHAR(40) NOT NULL,
    "issues_found" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reconciliation_runs_created_at_idx" ON "reconciliation_runs"("created_at");
