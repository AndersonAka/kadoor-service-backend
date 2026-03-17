-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetPasswordExpires" TIMESTAMP(3);
