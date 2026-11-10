-- Tarification au niveau du véhicule (plus partagée via VehicleTypePricing à l'enregistrement)
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "tier1MileageDailyAmount" DOUBLE PRECISION NOT NULL DEFAULT 30000;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "tier2MileageDailyAmount" DOUBLE PRECISION NOT NULL DEFAULT 45000;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "tier3MileageDailyAmount" DOUBLE PRECISION NOT NULL DEFAULT 70000;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "overagePricePerKm" DOUBLE PRECISION NOT NULL DEFAULT 350;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "insuranceAmount" DOUBLE PRECISION NOT NULL DEFAULT 15000;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "insuranceDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Reprise des grilles existantes par type pour chaque véhicule déjà en base
UPDATE "Vehicle" AS v
SET
  "tier1MileageDailyAmount" = p."tier1MileageDailyAmount",
  "tier2MileageDailyAmount" = p."tier2MileageDailyAmount",
  "tier3MileageDailyAmount" = p."tier3MileageDailyAmount",
  "overagePricePerKm" = p."overagePricePerKm",
  "insuranceAmount" = p."insuranceAmount",
  "insuranceDiscountPercent" = p."insuranceDiscountPercent"
FROM "VehicleTypePricing" AS p
WHERE p."vehicleType" = v."type";
