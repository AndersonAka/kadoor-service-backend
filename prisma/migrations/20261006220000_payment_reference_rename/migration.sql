-- Rename payment reference columns from Paystack to provider-agnostic names (GeniusPay)

ALTER TABLE "Booking" RENAME COLUMN "paystackReference" TO "paymentReference";
ALTER TABLE "Invoice" RENAME COLUMN "paystackReference" TO "paymentReference";
ALTER TABLE "GiftCard" RENAME COLUMN "paystackReference" TO "paymentReference";
ALTER TABLE "GiftCardBatch" RENAME COLUMN "paystackReference" TO "paymentReference";
