-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Apartment" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "ListingStatus" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" "ListingStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "Apartment_status_idx" ON "Apartment"("status");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");
