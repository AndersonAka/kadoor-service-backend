import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** Tarifs journaliers par type de véhicule (FCFA) — config métier, pas de listings. */
const typePricingSeeds: Array<{
  vehicleType: string;
  tier1MileageDailyAmount: number;
  tier2MileageDailyAmount: number;
  tier3MileageDailyAmount: number;
  overagePricePerKm: number;
  insuranceAmount: number;
  insuranceDiscountPercent: number;
}> = [
  {
    vehicleType: 'Berline',
    tier1MileageDailyAmount: 35000,
    tier2MileageDailyAmount: 50000,
    tier3MileageDailyAmount: 75000,
    overagePricePerKm: 300,
    insuranceAmount: 15000,
    insuranceDiscountPercent: 5,
  },
  {
    vehicleType: 'SUV',
    tier1MileageDailyAmount: 45000,
    tier2MileageDailyAmount: 60000,
    tier3MileageDailyAmount: 90000,
    overagePricePerKm: 350,
    insuranceAmount: 18000,
    insuranceDiscountPercent: 5,
  },
  {
    vehicleType: 'Utilitaire',
    tier1MileageDailyAmount: 28000,
    tier2MileageDailyAmount: 40000,
    tier3MileageDailyAmount: 62000,
    overagePricePerKm: 280,
    insuranceAmount: 12000,
    insuranceDiscountPercent: 0,
  },
  {
    vehicleType: 'Fourgonnette',
    tier1MileageDailyAmount: 32000,
    tier2MileageDailyAmount: 48000,
    tier3MileageDailyAmount: 72000,
    overagePricePerKm: 320,
    insuranceAmount: 14000,
    insuranceDiscountPercent: 0,
  },
  {
    vehicleType: 'Luxe',
    tier1MileageDailyAmount: 85000,
    tier2MileageDailyAmount: 120000,
    tier3MileageDailyAmount: 165000,
    overagePricePerKm: 450,
    insuranceAmount: 25000,
    insuranceDiscountPercent: 8,
  },
  {
    vehicleType: 'Pick-up',
    tier1MileageDailyAmount: 38000,
    tier2MileageDailyAmount: 55000,
    tier3MileageDailyAmount: 82000,
    overagePricePerKm: 340,
    insuranceAmount: 16000,
    insuranceDiscountPercent: 0,
  },
];

async function upsertAdmin(params: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const hashedPassword = await bcrypt.hash(params.password, 10);
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {
      password: hashedPassword,
      firstName: params.firstName,
      lastName: params.lastName,
      role: Role.ADMIN,
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: params.email,
      password: hashedPassword,
      firstName: params.firstName,
      lastName: params.lastName,
      role: Role.ADMIN,
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log(`Admin prêt : ${user.email}`);
  return user;
}

async function main() {
  console.log('Seed Kadoor — utilisateurs admin + tarifs véhicules (pas de listings / hero)…');

  // HeroSlide : plus de seed (images gérées côté frontend)
  // Véhicules / appartements : plus de seed (créés via l’admin)

  await upsertAdmin({
    email: 'admin@kadoorservice.com',
    password: 'admin@@123',
    firstName: 'Admin',
    lastName: 'KADOOR',
  });

  await upsertAdmin({
    email: 'admin.anderson@kadoorservice.com',
    password: 'Azerty.123',
    firstName: 'Anderson',
    lastName: 'KADOOR',
  });

  console.log('Seeding VehicleTypePricing…');
  for (const row of typePricingSeeds) {
    await prisma.vehicleTypePricing.upsert({
      where: { vehicleType: row.vehicleType },
      update: {
        tier1MileageDailyAmount: row.tier1MileageDailyAmount,
        tier2MileageDailyAmount: row.tier2MileageDailyAmount,
        tier3MileageDailyAmount: row.tier3MileageDailyAmount,
        overagePricePerKm: row.overagePricePerKm,
        insuranceAmount: row.insuranceAmount,
        insuranceDiscountPercent: row.insuranceDiscountPercent,
      },
      create: row,
    });
  }

  console.log('Seed terminé.');
  console.log('Comptes ADMIN :');
  console.log('  - admin@kadoorservice.com / admin@@123');
  console.log('  - admin.anderson@kadoorservice.com / Azerty.123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
