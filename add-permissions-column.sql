-- Run in Supabase -> SQL Editor: per-admin granular abilities (JSON array).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" TEXT;
