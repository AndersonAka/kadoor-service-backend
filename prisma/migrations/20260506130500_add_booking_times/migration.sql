-- Add booking time fields used by reservation flow
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "pickupTime" TEXT,
  ADD COLUMN IF NOT EXISTS "returnTime" TEXT;
