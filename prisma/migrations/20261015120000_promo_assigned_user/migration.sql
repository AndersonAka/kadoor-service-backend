-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN IF NOT EXISTS "assignedUserId" TEXT;
ALTER TABLE "PromoCode" ADD COLUMN IF NOT EXISTS "maxUsesPerUser" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PromoCode_assignedUserId_idx" ON "PromoCode"("assignedUserId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PromoCode_assignedUserId_fkey'
  ) THEN
    ALTER TABLE "PromoCode"
      ADD CONSTRAINT "PromoCode_assignedUserId_fkey"
      FOREIGN KEY ("assignedUserId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
