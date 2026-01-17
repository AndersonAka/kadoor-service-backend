-- Baseline migration: Synchronize database with schema
-- This migration includes all changes that were applied via db push

-- CreateEnum
CREATE TYPE IF NOT EXISTS "IncidentType" AS ENUM ('ACCIDENT', 'PANNE', 'SINISTRE', 'VOL', 'DOMMAGE', 'AUTRES');

-- CreateEnum
CREATE TYPE IF NOT EXISTS "IncidentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- AlterTable: Add columns to Vehicle
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "make" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "year" INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "fuel" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "transmission" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "seats" INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN IF NOT EXISTS "location" TEXT;

-- AlterTable: Add column to Apartment
ALTER TABLE "Apartment" ADD COLUMN IF NOT EXISTS "type" TEXT;

-- CreateTable: HeroSlide (if not exists)
CREATE TABLE IF NOT EXISTS "HeroSlide" (
    "id" SERIAL NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "subtitleFr" TEXT NOT NULL,
    "subtitleEn" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "buttonText" TEXT,
    "buttonLink" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Newsletter (if not exists)
CREATE TABLE IF NOT EXISTS "Newsletter" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Incident (if not exists)
CREATE TABLE IF NOT EXISTS "Incident" (
    "id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "date" TIMESTAMP(3),
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT,
    "vehicleId" TEXT,
    "apartmentId" TEXT,
    "images" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Newsletter email unique (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "Newsletter_email_key" ON "Newsletter"("email");

-- AddForeignKey: Incident userId (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Incident_userId_fkey'
    ) THEN
        ALTER TABLE "Incident" ADD CONSTRAINT "Incident_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Incident vehicleId (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Incident_vehicleId_fkey'
    ) THEN
        ALTER TABLE "Incident" ADD CONSTRAINT "Incident_vehicleId_fkey" 
        FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Incident apartmentId (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Incident_apartmentId_fkey'
    ) THEN
        ALTER TABLE "Incident" ADD CONSTRAINT "Incident_apartmentId_fkey" 
        FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
