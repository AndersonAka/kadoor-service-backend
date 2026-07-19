-- Migration de rattrapage : ces changements avaient été appliqués directement à la
-- base réelle via `prisma db push` (avant l'adoption de `prisma migrate`) et n'avaient
-- jamais été capturés dans l'historique des migrations. Toutes les instructions sont
-- idempotentes (sans effet si déjà appliquées) car la base réelle est déjà dans cet état ;
-- ce fichier sert à ce qu'une base reconstruite depuis zéro (`prisma migrate deploy`)
-- atteigne le même schéma final que celui décrit par prisma/schema.prisma.

-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'MERCHANT';

-- AlterTable: User (colonnes ajoutées pour OAuth Google + soft delete + adresse)
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatar" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'local';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

-- AlterTable: HeroSlide (buttonText générique -> buttonTextFr/buttonTextEn traduits)
ALTER TABLE "HeroSlide" ADD COLUMN IF NOT EXISTS "buttonTextFr" TEXT;
ALTER TABLE "HeroSlide" ADD COLUMN IF NOT EXISTS "buttonTextEn" TEXT;
ALTER TABLE "HeroSlide" DROP COLUMN IF EXISTS "buttonText";

-- CreateTable: Favorite
CREATE TABLE IF NOT EXISTS "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "apartmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_vehicleId_key" ON "Favorite"("userId", "vehicleId");
CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_apartmentId_key" ON "Favorite"("userId", "apartmentId");

-- AddForeignKey: Favorite (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Favorite_userId_fkey'
    ) THEN
        ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Favorite_vehicleId_fkey'
    ) THEN
        ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_vehicleId_fkey"
        FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Favorite_apartmentId_fkey'
    ) THEN
        ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_apartmentId_fkey"
        FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateTable: SiteSettings
CREATE TABLE IF NOT EXISTS "SiteSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SiteSettings_key_key" ON "SiteSettings"("key");

-- CreateTable: Testimonial
CREATE TABLE IF NOT EXISTS "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);
