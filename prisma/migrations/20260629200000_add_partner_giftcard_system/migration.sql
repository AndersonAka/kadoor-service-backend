-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "PartnerType" AS ENUM ('PHYSICAL', 'COMPANY', 'FREELANCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerCategory" AS ENUM ('AUTO', 'APARTMENT', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "GiftCardStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable Partner
CREATE TABLE IF NOT EXISTS "Partner" (
    "id" TEXT NOT NULL,
    "partnerType" "PartnerType" NOT NULL,
    "category" "PartnerCategory" NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "fullName" TEXT,
    "birthDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "idNumber" TEXT,
    "idType" TEXT,
    "idExpiry" TIMESTAMP(3),
    "nationality" TEXT,
    "legalName" TEXT,
    "registrationNumber" TEXT,
    "registrationDate" TIMESTAMP(3),
    "legalForm" TEXT,
    "incorporationCountry" TEXT,
    "businessSector" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "phone2" TEXT,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "beneficiaries" JSONB,
    "isPPE" BOOLEAN NOT NULL DEFAULT false,
    "ppeDetails" TEXT,
    "fundSources" TEXT[],
    "fundSourceOther" TEXT,
    "estimatedAnnualRevenue" DOUBLE PRECISION,
    "estimatedMonthlyTx" INTEGER,
    "avgTransactionValue" DOUBLE PRECISION,
    "maxTransactionValue" DOUBLE PRECISION,
    "bank1Name" TEXT,
    "bank1Country" TEXT,
    "bank2Name" TEXT,
    "bank2Country" TEXT,
    "otherPlatforms" TEXT[],
    "vehicleCount" INTEGER,
    "vehicleTypes" TEXT[],
    "fleetTotalValue" DOUBLE PRECISION,
    "fleetRenewalYear" INTEGER,
    "autoCompliance" TEXT[],
    "geoZones" TEXT,
    "pickupPoints" TEXT,
    "unitCount" INTEGER,
    "housingTypes" TEXT[],
    "mainCities" TEXT,
    "avgMonthlyRent" DOUBLE PRECISION,
    "realEstateCompliance" TEXT[],
    "includedServices" TEXT[],
    "riskScoreCountry" DOUBLE PRECISION,
    "riskScoreShareholders" DOUBLE PRECISION,
    "riskScorePPE" DOUBLE PRECISION,
    "riskScoreFunds" DOUBLE PRECISION,
    "riskScoreVolume" DOUBLE PRECISION,
    "riskScoreReputation" DOUBLE PRECISION,
    "riskScoreCompliance" DOUBLE PRECISION,
    "riskTotalScore" DOUBLE PRECISION,
    "riskLevel" "RiskLevel",
    "riskNotes" TEXT,
    "riskMeasures" TEXT,
    "nextReviewAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signedBy" TEXT,
    "kycAnalyst" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedById" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable PartnerDocument
CREATE TABLE IF NOT EXISTS "PartnerDocument" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable GiftCard
CREATE TABLE IF NOT EXISTS "GiftCard" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "GiftCardStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "initialAmount" DOUBLE PRECISION NOT NULL,
    "currentBalance" DOUBLE PRECISION NOT NULL,
    "theme" TEXT,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "senderMessage" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "paystackReference" TEXT,
    "userId" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "validatedById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable GiftCardOtp
CREATE TABLE IF NOT EXISTS "GiftCardOtp" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "cooldownUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable GiftCardTransaction
CREATE TABLE IF NOT EXISTS "GiftCardTransaction" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amountDeducted" DOUBLE PRECISION NOT NULL,
    "balanceBefore" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "receiptRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS "Partner_userId_key" ON "Partner"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "GiftCard_code_key" ON "GiftCard"("code");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "Partner" ADD CONSTRAINT "Partner_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PartnerDocument" ADD CONSTRAINT "PartnerDocument_partnerId_fkey"
    FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GiftCardOtp" ADD CONSTRAINT "GiftCardOtp_giftCardId_fkey"
    FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_giftCardId_fkey"
    FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_partnerId_fkey"
    FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
