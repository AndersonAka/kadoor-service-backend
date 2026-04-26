-- AlterTable: Add mileage package fields to Booking
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "mileagePackage"     TEXT,
  ADD COLUMN IF NOT EXISTS "mileagePackageCost" DOUBLE PRECISION;
