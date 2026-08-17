-- AlterEnum
ALTER TYPE "PartnerCategory" ADD VALUE 'GIFT_CARD';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'RENTAL_PARTNER';

-- AlterTable
ALTER TABLE "Apartment" ADD COLUMN     "partnerId" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "partnerId" TEXT;

-- CreateIndex
CREATE INDEX "Apartment_partnerId_idx" ON "Apartment"("partnerId");

-- CreateIndex
CREATE INDEX "Vehicle_partnerId_idx" ON "Vehicle"("partnerId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apartment" ADD CONSTRAINT "Apartment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
