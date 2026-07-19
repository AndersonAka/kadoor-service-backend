-- CreateIndex
CREATE INDEX "GiftCardTransaction_partnerId_createdAt_idx" ON "GiftCardTransaction"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "GiftCardTransaction_giftCardId_createdAt_idx" ON "GiftCardTransaction"("giftCardId", "createdAt");
