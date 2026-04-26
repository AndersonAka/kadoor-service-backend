-- AlterTable: Add cleaningFee to Apartment
ALTER TABLE "Apartment"
  ADD COLUMN IF NOT EXISTS "cleaningFee" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable: Add cleaningFee to Booking (for apartments)
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "cleaningFee" DOUBLE PRECISION;
