-- Tarification par type de véhicule ; suppression du prix/jour sur Vehicle

CREATE TABLE "VehicleTypePricing" (
    "id" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "basePricePerDay" DOUBLE PRECISION NOT NULL,
    "tier1KmPerDay" INTEGER NOT NULL DEFAULT 100,
    "tier1PricePerKm" DOUBLE PRECISION NOT NULL DEFAULT 300,
    "tier2KmPerDay" INTEGER NOT NULL DEFAULT 200,
    "tier2PricePerKm" DOUBLE PRECISION NOT NULL DEFAULT 270,
    "tier3KmPerDay" INTEGER NOT NULL DEFAULT 250,
    "tier3PricePerKm" DOUBLE PRECISION NOT NULL DEFAULT 280,
    "overagePricePerKm" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "insuranceAmount" DOUBLE PRECISION NOT NULL DEFAULT 15000,
    "insuranceDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleTypePricing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleTypePricing_vehicleType_key" ON "VehicleTypePricing"("vehicleType");

-- À partir des véhicules existants : une ligne par type (prix base = moyenne des anciens prix/jour)
INSERT INTO "VehicleTypePricing" (
    "id", "vehicleType", "basePricePerDay",
    "tier1KmPerDay", "tier1PricePerKm", "tier2KmPerDay", "tier2PricePerKm",
    "tier3KmPerDay", "tier3PricePerKm", "overagePricePerKm",
    "insuranceAmount", "insuranceDiscountPercent", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    "type",
    COALESCE(AVG("pricePerDay"), 50000),
    100, 300, 200, 270, 250, 280, 350, 15000, 0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Vehicle"
GROUP BY "type";

-- Types catalogue par défaut si absents
INSERT INTO "VehicleTypePricing" (
    "id", "vehicleType", "basePricePerDay",
    "tier1KmPerDay", "tier1PricePerKm", "tier2KmPerDay", "tier2PricePerKm",
    "tier3KmPerDay", "tier3PricePerKm", "overagePricePerKm",
    "insuranceAmount", "insuranceDiscountPercent", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    t.vtype,
    50000,
    100, 300, 200, 270, 250, 280, 350, 15000, 0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (VALUES ('Berline'), ('SUV'), ('Utilitaire'), ('Fourgonnette'), ('Luxe'), ('Pick-up')) AS t(vtype)
WHERE NOT EXISTS (
    SELECT 1 FROM "VehicleTypePricing" p WHERE p."vehicleType" = t.vtype
);

ALTER TABLE "Vehicle" DROP COLUMN "pricePerDay";
