-- AlterEnum: ajouter COMMERCIAL
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'COMMERCIAL';

-- AlterTable: permissions par utilisateur (modules admin)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[];
