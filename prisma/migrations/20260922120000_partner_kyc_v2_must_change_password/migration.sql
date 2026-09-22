-- Migration purement additive : l'ancien code (déjà déployé sur la même base) continue de fonctionner.

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "housingTypeOther" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "monthlyRentMax" DOUBLE PRECISION,
ADD COLUMN     "monthlyRentMin" DOUBLE PRECISION,
ADD COLUMN     "taxNumber" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Reprise des données : le loyer moyen saisi auparavant devient une fourchette min = max.
UPDATE "Partner"
SET "monthlyRentMin" = "avgMonthlyRent", "monthlyRentMax" = "avgMonthlyRent"
WHERE "avgMonthlyRent" IS NOT NULL;
