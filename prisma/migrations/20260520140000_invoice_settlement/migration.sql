-- CreateEnum
CREATE TYPE "InvoiceSettlementType" AS ENUM ('CLIENT_PAYS', 'KADOR_REFUND', 'ZERO_BALANCE');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "settlementType" "InvoiceSettlementType" NOT NULL DEFAULT 'CLIENT_PAYS',
ADD COLUMN "amountDue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "refundedAt" TIMESTAMP(3);

-- Backfill amountDue for existing rows
UPDATE "Invoice" SET "amountDue" = "totalAmount" WHERE "amountDue" = 0 AND "totalAmount" > 0;

UPDATE "Invoice" SET
  "settlementType" = 'KADOR_REFUND',
  "amountDue" = COALESCE("depositRefundAmount", 0)
WHERE "depositAmount" IS NOT NULL AND "depositAmount" > 0
  AND COALESCE("depositSupplementAmount", 0) = 0
  AND COALESCE("depositRefundAmount", 0) > 0;

UPDATE "Invoice" SET
  "settlementType" = 'ZERO_BALANCE',
  "amountDue" = 0
WHERE "depositAmount" IS NOT NULL AND "depositAmount" > 0
  AND COALESCE("depositSupplementAmount", 0) = 0
  AND COALESCE("depositRefundAmount", 0) = 0;

UPDATE "Invoice" SET
  "settlementType" = 'CLIENT_PAYS',
  "amountDue" = COALESCE("depositSupplementAmount", 0) + COALESCE("taxAmount", 0)
WHERE "depositAmount" IS NOT NULL AND "depositAmount" > 0
  AND COALESCE("depositSupplementAmount", 0) > 0;
