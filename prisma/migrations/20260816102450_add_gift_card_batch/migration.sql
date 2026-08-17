-- CreateEnum
CREATE TYPE "GiftCardBatchBuyerType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- AlterTable
ALTER TABLE "GiftCard" ADD COLUMN     "batchId" TEXT;

-- CreateTable
CREATE TABLE "GiftCardBatch" (
    "id" TEXT NOT NULL,
    "status" "GiftCardStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "buyerType" "GiftCardBatchBuyerType" NOT NULL,
    "companyName" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitAmount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paystackReference" TEXT,
    "userId" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCardBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftCardBatch_paystackReference_key" ON "GiftCardBatch"("paystackReference");

-- CreateIndex
CREATE INDEX "GiftCard_batchId_idx" ON "GiftCard"("batchId");

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "GiftCardBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardBatch" ADD CONSTRAINT "GiftCardBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
