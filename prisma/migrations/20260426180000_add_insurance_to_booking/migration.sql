-- AlterTable: Add insurance fields to Booking
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "hasInsurance"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "insurancePrice"    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "insuranceDiscount" DOUBLE PRECISION;
