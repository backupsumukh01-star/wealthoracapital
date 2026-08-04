-- Phase 2: profiles, audit, activity, notifications, extended user statuses

CREATE TYPE "ActivityKind" AS ENUM ('LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'EMAIL_CHANGE', 'PROFILE_UPDATE', 'ADMIN_ACTION', 'ACCOUNT_STATUS_CHANGE', 'SESSION_TERMINATED', 'AVATAR_UPDATE', 'REGISTRATION');

CREATE TYPE "NotificationKind" AS ENUM ('SYSTEM', 'SECURITY', 'ACCOUNT', 'ADMIN');

ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'BLOCKED';
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "address_line1" VARCHAR(120),
    "address_line2" VARCHAR(120),
    "city" VARCHAR(80),
    "state" VARCHAR(80),
    "postal_code" VARCHAR(24),
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "bio" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "target_user_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "module" VARCHAR(80) NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "reason" VARCHAR(500),
    "ip" TEXT,
    "user_agent" VARCHAR(400),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "actor_id" UUID,
    "kind" "ActivityKind" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "metadata" JSONB,
    "ip" TEXT,
    "user_agent" VARCHAR(400),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL DEFAULT 'SYSTEM',
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "metadata" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");
CREATE INDEX "audit_logs_target_user_id_idx" ON "audit_logs"("target_user_id");
CREATE INDEX "audit_logs_module_action_idx" ON "audit_logs"("module", "action");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

CREATE INDEX "activity_logs_user_id_created_at_idx" ON "activity_logs"("user_id", "created_at");
CREATE INDEX "activity_logs_kind_created_at_idx" ON "activity_logs"("kind", "created_at");
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

CREATE INDEX "users_country_idx" ON "users"("country");
CREATE INDEX "users_phone_idx" ON "users"("phone");

ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
