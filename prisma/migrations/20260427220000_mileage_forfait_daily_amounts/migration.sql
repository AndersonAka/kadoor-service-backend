-- Forfaits km : montant journalier par tranche (remplace km/j × FCFA/km)

ALTER TABLE "VehicleTypePricing" ADD COLUMN "tier1MileageDailyAmount" DOUBLE PRECISION;
ALTER TABLE "VehicleTypePricing" ADD COLUMN "tier2MileageDailyAmount" DOUBLE PRECISION;
ALTER TABLE "VehicleTypePricing" ADD COLUMN "tier3MileageDailyAmount" DOUBLE PRECISION;

UPDATE "VehicleTypePricing" SET
  "tier1MileageDailyAmount" = ROUND(("tier1KmPerDay")::numeric * "tier1PricePerKm"),
  "tier2MileageDailyAmount" = ROUND(("tier2KmPerDay")::numeric * "tier2PricePerKm"),
  "tier3MileageDailyAmount" = ROUND(("tier3KmPerDay")::numeric * "tier3PricePerKm");

ALTER TABLE "VehicleTypePricing" ALTER COLUMN "tier1MileageDailyAmount" SET NOT NULL;
ALTER TABLE "VehicleTypePricing" ALTER COLUMN "tier1MileageDailyAmount" SET DEFAULT 30000;
ALTER TABLE "VehicleTypePricing" ALTER COLUMN "tier2MileageDailyAmount" SET NOT NULL;
ALTER TABLE "VehicleTypePricing" ALTER COLUMN "tier2MileageDailyAmount" SET DEFAULT 45000;
ALTER TABLE "VehicleTypePricing" ALTER COLUMN "tier3MileageDailyAmount" SET NOT NULL;
ALTER TABLE "VehicleTypePricing" ALTER COLUMN "tier3MileageDailyAmount" SET DEFAULT 70000;

ALTER TABLE "VehicleTypePricing" DROP COLUMN "tier1KmPerDay";
ALTER TABLE "VehicleTypePricing" DROP COLUMN "tier1PricePerKm";
ALTER TABLE "VehicleTypePricing" DROP COLUMN "tier2KmPerDay";
ALTER TABLE "VehicleTypePricing" DROP COLUMN "tier2PricePerKm";
ALTER TABLE "VehicleTypePricing" DROP COLUMN "tier3KmPerDay";
ALTER TABLE "VehicleTypePricing" DROP COLUMN "tier3PricePerKm";
