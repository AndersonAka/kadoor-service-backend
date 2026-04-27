-- Le tarif journalier dérive uniquement des forfaits km (T1/T2/T3).
ALTER TABLE "VehicleTypePricing" DROP COLUMN IF EXISTS "basePricePerDay";
