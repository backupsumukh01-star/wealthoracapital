-- Deposit proof image metadata for admin/investor preview
ALTER TABLE "deposits" ADD COLUMN IF NOT EXISTS "proof_image_url" VARCHAR(800);
ALTER TABLE "deposits" ADD COLUMN IF NOT EXISTS "proof_uploaded_at" TIMESTAMP(3);