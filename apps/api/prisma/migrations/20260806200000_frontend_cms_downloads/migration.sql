-- AlterEnum: add FRONTEND CMS document key
DO $$ BEGIN
  ALTER TYPE "CmsDocumentKey" ADD VALUE 'FRONTEND';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "DownloadVisibility" AS ENUM ('PUBLIC', 'AUTHENTICATED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "cms_downloads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "category" VARCHAR(80) NOT NULL DEFAULT 'General',
    "thumbnail_url" VARCHAR(500),
    "button_label" VARCHAR(80) NOT NULL DEFAULT 'Download',
    "version" VARCHAR(40) NOT NULL DEFAULT '1.0',
    "publish_date" TIMESTAMP(3),
    "visibility" "DownloadVisibility" NOT NULL DEFAULT 'PUBLIC',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "CmsStatus" NOT NULL DEFAULT 'DRAFT',
    "file_name" VARCHAR(260) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" VARCHAR(400) NOT NULL,
    "url" VARCHAR(600) NOT NULL,
    "media_asset_id" UUID,
    "created_by_id" UUID,
    "created_by_name" VARCHAR(160),
    "download_count" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cms_downloads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cms_downloads_status_visibility_sort_order_idx" ON "cms_downloads"("status", "visibility", "sort_order");
CREATE INDEX IF NOT EXISTS "cms_downloads_category_status_idx" ON "cms_downloads"("category", "status");
CREATE INDEX IF NOT EXISTS "cms_downloads_deleted_at_idx" ON "cms_downloads"("deleted_at");
