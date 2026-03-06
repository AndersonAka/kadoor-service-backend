-- AlterTable: Add paystackReference to Booking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paystackReference" TEXT;
