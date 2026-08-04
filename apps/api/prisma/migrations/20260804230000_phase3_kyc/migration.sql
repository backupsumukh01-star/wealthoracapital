-- CreateEnum
CREATE TYPE "KycDocumentType" AS ENUM ('PASSPORT', 'NATIONAL_ID', 'DRIVING_LICENSE', 'RESIDENCE_PERMIT', 'PROOF_OF_ADDRESS', 'SELFIE', 'BANK_STATEMENT', 'UTILITY_BILL');

-- CreateEnum
CREATE TYPE "KycDocumentSide" AS ENUM ('FRONT', 'BACK', 'SINGLE');

-- CreateEnum
CREATE TYPE "KycDocumentStatus" AS ENUM ('UPLOADED', 'VERIFIED', 'REJECTED', 'REPLACED');

-- CreateEnum
CREATE TYPE "KycRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "KycReviewDecision" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_INFORMATION', 'EXPIRE', 'REOPEN', 'SUSPEND');

-- CreateEnum
CREATE TYPE "KycHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'DOCUMENT_UPLOADED', 'DOCUMENT_DELETED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'INFO_REQUESTED', 'EXPIRED', 'REOPENED', 'SUSPENDED', 'ASSIGNED', 'NOTE_ADDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'KYC_SUBMITTED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'KYC_APPROVED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'KYC_REJECTED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'KYC_INFO_REQUESTED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'KYC_EXPIRED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'KYC_SUSPENDED';
ALTER TYPE "ActivityKind" ADD VALUE IF NOT EXISTS 'KYC_REOPENED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "KycStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "KycStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "KycStatus" ADD VALUE IF NOT EXISTS 'NEED_MORE_INFO';
ALTER TYPE "KycStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "KycStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

-- CreateTable
CREATE TABLE "kyc_submissions" (
    "id" UUID NOT NULL,
    "reference_id" VARCHAR(24) NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "country" CHAR(2) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "nationality" CHAR(2),
    "address_line1" VARCHAR(120),
    "city" VARCHAR(80),
    "postal_code" VARCHAR(24),
    "occupation" VARCHAR(80),
    "primary_document_type" "KycDocumentType",
    "risk_level" "KycRiskLevel" NOT NULL DEFAULT 'LOW',
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "fraud_flag" BOOLEAN NOT NULL DEFAULT false,
    "document_quality" INTEGER,
    "assigned_reviewer_id" UUID,
    "rejection_reason" VARCHAR(500),
    "info_request_message" VARCHAR(1000),
    "internal_notes" VARCHAR(2000),
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_documents" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "document_type" "KycDocumentType" NOT NULL,
    "side" "KycDocumentSide" NOT NULL DEFAULT 'SINGLE',
    "status" "KycDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "storage_key" VARCHAR(400) NOT NULL,
    "original_name" VARCHAR(200) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum_sha256" VARCHAR(64) NOT NULL,
    "virus_scan_status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_reviews" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "reviewer_id" UUID,
    "decision" "KycReviewDecision" NOT NULL,
    "reason" VARCHAR(1000),
    "internal_notes" VARCHAR(2000),
    "risk_level" "KycRiskLevel",
    "risk_score" INTEGER,
    "fraud_flag" BOOLEAN,
    "document_quality" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_histories" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "actor_id" UUID,
    "action" "KycHistoryAction" NOT NULL,
    "message" VARCHAR(1000),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kyc_submissions_reference_id_key" ON "kyc_submissions"("reference_id");

-- CreateIndex
CREATE INDEX "kyc_submissions_user_id_status_idx" ON "kyc_submissions"("user_id", "status");

-- CreateIndex
CREATE INDEX "kyc_submissions_status_created_at_idx" ON "kyc_submissions"("status", "created_at");

-- CreateIndex
CREATE INDEX "kyc_submissions_country_idx" ON "kyc_submissions"("country");

-- CreateIndex
CREATE INDEX "kyc_submissions_risk_level_idx" ON "kyc_submissions"("risk_level");

-- CreateIndex
CREATE INDEX "kyc_submissions_assigned_reviewer_id_idx" ON "kyc_submissions"("assigned_reviewer_id");

-- CreateIndex
CREATE INDEX "kyc_submissions_reference_id_idx" ON "kyc_submissions"("reference_id");

-- CreateIndex
CREATE INDEX "kyc_documents_submission_id_idx" ON "kyc_documents"("submission_id");

-- CreateIndex
CREATE INDEX "kyc_documents_checksum_sha256_idx" ON "kyc_documents"("checksum_sha256");

-- CreateIndex
CREATE INDEX "kyc_documents_document_type_idx" ON "kyc_documents"("document_type");

-- CreateIndex
CREATE INDEX "kyc_reviews_submission_id_created_at_idx" ON "kyc_reviews"("submission_id", "created_at");

-- CreateIndex
CREATE INDEX "kyc_reviews_reviewer_id_idx" ON "kyc_reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "kyc_histories_submission_id_created_at_idx" ON "kyc_histories"("submission_id", "created_at");

-- CreateIndex
CREATE INDEX "users_kyc_status_idx" ON "users"("kyc_status");

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "kyc_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_reviews" ADD CONSTRAINT "kyc_reviews_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "kyc_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_reviews" ADD CONSTRAINT "kyc_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_histories" ADD CONSTRAINT "kyc_histories_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "kyc_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

