-- Run in Supabase -> SQL Editor: stores per-category document AI completeness.
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "docChecks" TEXT;
