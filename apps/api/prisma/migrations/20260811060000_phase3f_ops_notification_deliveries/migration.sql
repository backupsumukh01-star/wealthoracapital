-- Phase 3F: ops notification delivery dedupe (Telegram / gated referral emails)
CREATE TABLE IF NOT EXISTS "ops_notification_deliveries" (
    "id" UUID NOT NULL,
    "channel" VARCHAR(40) NOT NULL,
    "event_key" VARCHAR(220) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ops_notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ops_notification_deliveries_channel_event_key_key"
  ON "ops_notification_deliveries"("channel", "event_key");

CREATE INDEX IF NOT EXISTS "ops_notification_deliveries_created_at_idx"
  ON "ops_notification_deliveries"("created_at");
