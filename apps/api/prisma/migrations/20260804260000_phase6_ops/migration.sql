-- CreateEnum
CREATE TYPE "CmsDocumentKey" AS ENUM ('LANDING', 'PLATFORM');

-- CreateEnum
CREATE TYPE "CmsStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CmsRevisionAction" AS ENUM ('AUTOSAVE', 'SAVE', 'PUBLISH', 'ROLLBACK', 'SCHEDULE');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'ICON', 'PDF', 'VIDEO', 'SVG', 'LOGO', 'BACKGROUND', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'INVESTOR', 'PORTFOLIO', 'PERFORMANCE', 'FINANCE', 'KYC', 'AUDIT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('CSV', 'JSON', 'XLSX', 'PDF');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "EmailOutboxStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SupportCategory" AS ENUM ('GENERAL', 'BILLING', 'KYC', 'DEPOSIT', 'WITHDRAWAL', 'TECHNICAL', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportMessageAuthorType" AS ENUM ('USER', 'AGENT', 'SYSTEM', 'INTERNAL_NOTE');

-- CreateEnum
CREATE TYPE "AnnouncementType" AS ENUM ('MAINTENANCE', 'PROMOTION', 'NEWS', 'RETURN', 'POPUP', 'TOP_BANNER', 'DASHBOARD_BANNER');

-- CreateEnum
CREATE TYPE "AnnouncementDisplayPage" AS ENUM ('ALL', 'HOME', 'DASHBOARD', 'WALLET');

-- CreateEnum
CREATE TYPE "BroadcastChannel" AS ENUM ('EMAIL', 'IN_APP', 'POPUP', 'BANNER', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BroadcastAudience" AS ENUM ('ALL', 'SEGMENT', 'COUNTRY', 'VIP', 'SELECTED', 'SINGLE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityKind" ADD VALUE 'CMS_PUBLISHED';
ALTER TYPE "ActivityKind" ADD VALUE 'CMS_ROLLBACK';
ALTER TYPE "ActivityKind" ADD VALUE 'CMS_SCHEDULED';
ALTER TYPE "ActivityKind" ADD VALUE 'MEDIA_UPLOADED';
ALTER TYPE "ActivityKind" ADD VALUE 'MEDIA_DELETED';
ALTER TYPE "ActivityKind" ADD VALUE 'REPORT_GENERATED';
ALTER TYPE "ActivityKind" ADD VALUE 'EMAIL_TEMPLATE_UPDATED';
ALTER TYPE "ActivityKind" ADD VALUE 'EMAIL_SENT';
ALTER TYPE "ActivityKind" ADD VALUE 'SUPPORT_TICKET_CREATED';
ALTER TYPE "ActivityKind" ADD VALUE 'SUPPORT_TICKET_REPLIED';
ALTER TYPE "ActivityKind" ADD VALUE 'SUPPORT_TICKET_ASSIGNED';
ALTER TYPE "ActivityKind" ADD VALUE 'SUPPORT_TICKET_CLOSED';
ALTER TYPE "ActivityKind" ADD VALUE 'BROADCAST_SENT';
ALTER TYPE "ActivityKind" ADD VALUE 'SETTINGS_UPDATED';
ALTER TYPE "ActivityKind" ADD VALUE 'FEATURE_FLAG_UPDATED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'SUPPORT';
ALTER TYPE "NotificationKind" ADD VALUE 'MARKETING';
ALTER TYPE "NotificationKind" ADD VALUE 'BROADCAST';

-- CreateTable
CREATE TABLE "cms_documents" (
    "id" UUID NOT NULL,
    "key" "CmsDocumentKey" NOT NULL,
    "status" "CmsStatus" NOT NULL DEFAULT 'DRAFT',
    "draft_content" JSONB NOT NULL,
    "published_content" JSONB,
    "scheduled_content" JSONB,
    "scheduled_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMP(3),
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_revisions" (
    "id" UUID NOT NULL,
    "document_key" "CmsDocumentKey" NOT NULL,
    "action" "CmsRevisionAction" NOT NULL,
    "version" INTEGER NOT NULL,
    "label" VARCHAR(160),
    "snapshot" JSONB NOT NULL,
    "actor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cms_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_faqs" (
    "id" UUID NOT NULL,
    "question" VARCHAR(300) NOT NULL,
    "answer" VARCHAR(3000) NOT NULL,
    "category" VARCHAR(80),
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "CmsStatus" NOT NULL DEFAULT 'PUBLISHED',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_testimonials" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "country" VARCHAR(80),
    "quote" VARCHAR(2000) NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "platform" VARCHAR(60),
    "photo_url" VARCHAR(400),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'NEWS',
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "status" "CmsStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "PriorityLevel" NOT NULL DEFAULT 'NORMAL',
    "display_page" "AnnouncementDisplayPage" NOT NULL DEFAULT 'ALL',
    "color" VARCHAR(20),
    "sticky" BOOLEAN NOT NULL DEFAULT false,
    "popup" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cms_pages" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "status" "CmsStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "folder" VARCHAR(80) NOT NULL DEFAULT 'Uploads',
    "kind" "MediaKind" NOT NULL DEFAULT 'OTHER',
    "mime_type" VARCHAR(120) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" VARCHAR(400) NOT NULL,
    "url" VARCHAR(600) NOT NULL,
    "used_by" VARCHAR(200),
    "description" VARCHAR(500),
    "checksum_sha256" VARCHAR(64),
    "created_by_id" UUID,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_jobs" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(32) NOT NULL,
    "type" "ReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "scope" VARCHAR(20) NOT NULL DEFAULT 'ADMIN',
    "requested_by_id" UUID,
    "params" JSONB,
    "file_key" VARCHAR(400),
    "file_name" VARCHAR(200),
    "size_bytes" INTEGER,
    "row_count" INTEGER,
    "error_message" VARCHAR(1000),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "category" VARCHAR(40) NOT NULL DEFAULT 'SYSTEM',
    "subject" VARCHAR(200) NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "variables" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_template_versions" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "actor_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_outbox" (
    "id" UUID NOT NULL,
    "template_id" UUID,
    "template_key" VARCHAR(80),
    "to_email" VARCHAR(200) NOT NULL,
    "user_id" UUID,
    "subject" VARCHAR(200) NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "variables" JSONB,
    "status" "EmailOutboxStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" VARCHAR(1000),
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "open_token" VARCHAR(64),
    "click_token" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(32) NOT NULL,
    "user_id" UUID NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "category" "SupportCategory" NOT NULL DEFAULT 'GENERAL',
    "priority" "PriorityLevel" NOT NULL DEFAULT 'NORMAL',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignee_id" UUID,
    "merged_into_id" UUID,
    "internal_notes" VARCHAR(4000),
    "closed_at" TIMESTAMP(3),
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "author_id" UUID,
    "author_type" "SupportMessageAuthorType" NOT NULL DEFAULT 'USER',
    "body" VARCHAR(4000) NOT NULL,
    "attachments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcasts" (
    "id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(3000) NOT NULL,
    "channels" JSONB NOT NULL,
    "audience" "BroadcastAudience" NOT NULL DEFAULT 'ALL',
    "audience_filter" JSONB,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "stats" JSONB,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" UUID NOT NULL,
    "company_name" VARCHAR(120) NOT NULL DEFAULT 'Growzy',
    "support_email" VARCHAR(160) NOT NULL DEFAULT 'support@growzy.com',
    "support_phone" VARCHAR(40),
    "default_currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "timezone" VARCHAR(60) NOT NULL DEFAULT 'UTC',
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "networks" JSONB NOT NULL DEFAULT '[]',
    "coins" JSONB NOT NULL DEFAULT '[]',
    "min_deposit" DECIMAL(20,8) NOT NULL DEFAULT 50,
    "max_deposit" DECIMAL(20,8) NOT NULL DEFAULT 1000000,
    "min_withdrawal" DECIMAL(20,8) NOT NULL DEFAULT 20,
    "max_withdrawal" DECIMAL(20,8) NOT NULL DEFAULT 1000000,
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "key" VARCHAR(60) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" VARCHAR(300),
    "updated_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cms_documents_key_key" ON "cms_documents"("key");

-- CreateIndex
CREATE INDEX "cms_revisions_document_key_created_at_idx" ON "cms_revisions"("document_key", "created_at");

-- CreateIndex
CREATE INDEX "cms_revisions_document_key_version_idx" ON "cms_revisions"("document_key", "version");

-- CreateIndex
CREATE INDEX "cms_faqs_status_order_idx" ON "cms_faqs"("status", "order");

-- CreateIndex
CREATE INDEX "cms_testimonials_enabled_order_idx" ON "cms_testimonials"("enabled", "order");

-- CreateIndex
CREATE INDEX "announcements_status_display_page_idx" ON "announcements"("status", "display_page");

-- CreateIndex
CREATE INDEX "announcements_status_scheduled_at_idx" ON "announcements"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_slug_key" ON "cms_pages"("slug");

-- CreateIndex
CREATE INDEX "media_assets_folder_idx" ON "media_assets"("folder");

-- CreateIndex
CREATE INDEX "media_assets_kind_idx" ON "media_assets"("kind");

-- CreateIndex
CREATE INDEX "media_assets_deleted_at_idx" ON "media_assets"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "report_jobs_reference_key" ON "report_jobs"("reference");

-- CreateIndex
CREATE INDEX "report_jobs_type_status_idx" ON "report_jobs"("type", "status");

-- CreateIndex
CREATE INDEX "report_jobs_requested_by_id_created_at_idx" ON "report_jobs"("requested_by_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_key_key" ON "email_templates"("key");

-- CreateIndex
CREATE INDEX "email_template_versions_template_id_version_idx" ON "email_template_versions"("template_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "email_outbox_open_token_key" ON "email_outbox"("open_token");

-- CreateIndex
CREATE UNIQUE INDEX "email_outbox_click_token_key" ON "email_outbox"("click_token");

-- CreateIndex
CREATE INDEX "email_outbox_status_scheduled_at_idx" ON "email_outbox"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "email_outbox_user_id_created_at_idx" ON "email_outbox"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_reference_key" ON "support_tickets"("reference");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_status_idx" ON "support_tickets"("user_id", "status");

-- CreateIndex
CREATE INDEX "support_tickets_status_priority_idx" ON "support_tickets"("status", "priority");

-- CreateIndex
CREATE INDEX "support_tickets_assignee_id_idx" ON "support_tickets"("assignee_id");

-- CreateIndex
CREATE INDEX "support_messages_ticket_id_created_at_idx" ON "support_messages"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "broadcasts_status_scheduled_at_idx" ON "broadcasts"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- AddForeignKey
ALTER TABLE "cms_revisions" ADD CONSTRAINT "cms_revisions_document_key_fkey" FOREIGN KEY ("document_key") REFERENCES "cms_documents"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_template_versions" ADD CONSTRAINT "email_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

