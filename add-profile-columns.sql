-- Run in Supabase -> SQL Editor to add profile fields to existing User table.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarKey" TEXT;
