-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "depositAmount" DOUBLE PRECISION,
ADD COLUMN "depositPaymentMethod" TEXT,
ADD COLUMN "depositCollectedAt" TIMESTAMP(3),
ADD COLUMN "depositNote" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "depositAmount" DOUBLE PRECISION,
ADD COLUMN "depositDeductionsAmount" DOUBLE PRECISION,
ADD COLUMN "depositRefundAmount" DOUBLE PRECISION,
ADD COLUMN "depositSupplementAmount" DOUBLE PRECISION,
ADD COLUMN "depositPaymentMethod" TEXT,
ADD COLUMN "depositNote" TEXT;
