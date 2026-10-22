-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Booking" ADD COLUMN "internalNote" TEXT;

-- CreateIndex
CREATE INDEX "Booking_source_status_idx" ON "Booking"("source", "status");
