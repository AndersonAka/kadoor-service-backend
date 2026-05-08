-- Create invoice enums
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'CANCELLED', 'DISPUTED', 'OVERDUE');
CREATE TYPE "InvoiceLineCategory" AS ENUM ('DAMAGE', 'LATE_RETURN', 'MILEAGE_OVERAGE', 'TRAFFIC_FINE', 'CLEANING', 'OTHER');

-- Create Invoice table
CREATE TABLE "Invoice" (
  "id" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" TIMESTAMP(3),
  "subtotal" DOUBLE PRECISION NOT NULL,
  "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'FCFA',
  "paystackReference" TEXT,
  "sentAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "internalNote" TEXT,
  "customerNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "bookingId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- Create InvoiceLine table
CREATE TABLE "InvoiceLine" (
  "id" TEXT NOT NULL,
  "category" "InvoiceLineCategory" NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "lineTotal" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "invoiceId" TEXT NOT NULL,
  CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invoice_reference_key" ON "Invoice"("reference");

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InvoiceLine"
  ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
