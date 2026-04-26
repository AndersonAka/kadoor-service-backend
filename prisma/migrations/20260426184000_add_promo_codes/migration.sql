-- CreateTable: PromoCode
CREATE TABLE IF NOT EXISTS "PromoCode" (
    "id"            TEXT NOT NULL,
    "code"          TEXT NOT NULL,
    "description"   TEXT,
    "discountType"  TEXT NOT NULL DEFAULT 'PERCENT',
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minAmount"     DOUBLE PRECISION,
    "maxUses"       INTEGER,
    "usedCount"     INTEGER NOT NULL DEFAULT 0,
    "validFrom"     TIMESTAMP(3),
    "validUntil"    TIMESTAMP(3),
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "appliesTo"     TEXT NOT NULL DEFAULT 'ALL',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PromoCode_code_key" ON "PromoCode"("code");

-- AlterTable: Add promo fields to Booking
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "promoCode"     TEXT,
  ADD COLUMN IF NOT EXISTS "promoCodeId"   TEXT,
  ADD COLUMN IF NOT EXISTS "promoDiscount" DOUBLE PRECISION;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_promoCodeId_fkey"
    FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
