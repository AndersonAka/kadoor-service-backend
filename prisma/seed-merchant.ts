import { PrismaClient, Role, PartnerType, PartnerCategory, PartnerStatus, RiskLevel } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL non défini');

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Création du partenaire loueur test (auto + immobilier)...');

  const hashedPassword = await bcrypt.hash('Merchant123!', 10);

  // Partenaire loueur : met des biens (véhicules / logements) à disposition de KADOOR
  // pour la location -> catégorie AUTO/APARTMENT/BOTH -> rôle RENTAL_PARTNER, espace /espace-partenaire.
  const rentalUser = await prisma.user.upsert({
    where: { email: 'partenaire.test@kadoorservice.com' },
    update: { role: Role.RENTAL_PARTNER, isActive: true },
    create: {
      email: 'partenaire.test@kadoorservice.com',
      password: hashedPassword,
      firstName: 'Kofi',
      lastName: 'ASANTE',
      phone: '+2250700000001',
      role: Role.RENTAL_PARTNER,
      isActive: true,
    },
  });
  console.log(`✅ Utilisateur RENTAL_PARTNER : ${rentalUser.email} (id: ${rentalUser.id})`);

  const rentalPartner = await prisma.partner.upsert({
    where: { userId: rentalUser.id },
    update: { status: PartnerStatus.APPROVED },
    create: {
      partnerType: PartnerType.COMPANY,
      category: PartnerCategory.BOTH,
      status: PartnerStatus.APPROVED,

      // Personne morale
      legalName: 'Asante Commerce & Services',
      registrationNumber: 'CI-ABJ-2024-B-12345',
      legalForm: 'SARL',
      incorporationCountry: 'CI',
      businessSector: 'Location auto & immobilier',

      // Coordonnées
      address: "Cocody Riviera 3, Abidjan, Côte d'Ivoire",
      phone: '+2250700000001',
      phone2: '+2250700000002',
      email: 'partenaire.test@kadoorservice.com',
      website: 'https://asante-services.ci',

      // Bénéficiaires
      beneficiaries: [{ name: 'Kofi ASANTE', title: 'Gérant', nationality: 'CI', ownershipPct: 100 }],
      isPPE: false,

      // Finances
      fundSources: ["Revenus d'activité", 'Prêt bancaire'],
      estimatedAnnualRevenue: 50000000,
      estimatedMonthlyTx: 120,
      avgTransactionValue: 35000,
      maxTransactionValue: 250000,
      bank1Name: 'SGBCI',
      bank1Country: 'CI',

      // Évaluation risque
      riskScoreCountry: 2.5,
      riskScoreShareholders: 1.0,
      riskScorePPE: 0.0,
      riskScoreFunds: 1.5,
      riskScoreVolume: 2.0,
      riskScoreReputation: 1.0,
      riskScoreCompliance: 1.0,
      riskTotalScore: 9.0,
      riskLevel: RiskLevel.LOW,
      riskNotes: 'Dossier test — risque faible',
      riskMeasures: 'Suivi trimestriel standard',

      // Validation KYC
      validatedAt: new Date(),
      validatedById: 'system-seed',
      signedAt: new Date(),
      signedBy: 'Kofi ASANTE',
      kycAnalyst: 'Admin Kadoor',

      userId: rentalUser.id,
    },
  });

  console.log(`✅ Partenaire loueur : ${rentalPartner.legalName} (id: ${rentalPartner.id})`);

  console.log('\n🌱 Création du marchand test (cartes cadeaux)...');

  // Partenaire commerçant : chez qui les clients dépensent leurs cartes cadeaux
  // -> catégorie GIFT_CARD -> rôle MERCHANT, espace /espace-marchand.
  const merchantUser = await prisma.user.upsert({
    where: { email: 'marchand.test@kadoorservice.com' },
    update: { role: Role.MERCHANT, isActive: true },
    create: {
      email: 'marchand.test@kadoorservice.com',
      password: hashedPassword,
      firstName: 'Aya',
      lastName: 'KONE',
      phone: '+2250700000003',
      role: Role.MERCHANT,
      isActive: true,
    },
  });
  console.log(`✅ Utilisateur MERCHANT : ${merchantUser.email} (id: ${merchantUser.id})`);

  const giftCardPartner = await prisma.partner.upsert({
    where: { userId: merchantUser.id },
    update: { status: PartnerStatus.APPROVED },
    create: {
      partnerType: PartnerType.COMPANY,
      category: PartnerCategory.GIFT_CARD,
      status: PartnerStatus.APPROVED,

      // Personne morale
      legalName: 'Kone Boutique & Restauration',
      registrationNumber: 'CI-ABJ-2024-B-67890',
      legalForm: 'SARL',
      incorporationCountry: 'CI',
      businessSector: 'Commerce général & Restauration',

      // Coordonnées
      address: "Plateau, Abidjan, Côte d'Ivoire",
      phone: '+2250700000003',
      phone2: '+2250700000004',
      email: 'marchand.test@kadoorservice.com',
      website: 'https://kone-boutique.ci',

      // Bénéficiaires
      beneficiaries: [{ name: 'Aya KONE', title: 'Gérante', nationality: 'CI', ownershipPct: 100 }],
      isPPE: false,

      // Finances
      fundSources: ["Revenus d'activité"],
      estimatedAnnualRevenue: 30000000,
      estimatedMonthlyTx: 200,
      avgTransactionValue: 15000,
      maxTransactionValue: 250000,
      bank1Name: 'SGBCI',
      bank1Country: 'CI',

      // Évaluation risque
      riskScoreCountry: 2.5,
      riskScoreShareholders: 1.0,
      riskScorePPE: 0.0,
      riskScoreFunds: 1.5,
      riskScoreVolume: 2.0,
      riskScoreReputation: 1.0,
      riskScoreCompliance: 1.0,
      riskTotalScore: 9.0,
      riskLevel: RiskLevel.LOW,
      riskNotes: 'Dossier test — risque faible',
      riskMeasures: 'Suivi trimestriel standard',

      // Validation KYC
      validatedAt: new Date(),
      validatedById: 'system-seed',
      signedAt: new Date(),
      signedBy: 'Aya KONE',
      kycAnalyst: 'Admin Kadoor',

      userId: merchantUser.id,
    },
  });

  console.log(`✅ Marchand cartes cadeaux : ${giftCardPartner.legalName} (id: ${giftCardPartner.id})`);

  console.log('\n📋 Identifiants des comptes test :');
  console.log('   1) Partenaire loueur (auto + immobilier)');
  console.log('      Email        : partenaire.test@kadoorservice.com');
  console.log('      Mot de passe : Merchant123!');
  console.log('      Rôle         : RENTAL_PARTNER');
  console.log('      Accès        : /fr/espace-partenaire');
  console.log('   2) Marchand cartes cadeaux');
  console.log('      Email        : marchand.test@kadoorservice.com');
  console.log('      Mot de passe : Merchant123!');
  console.log('      Rôle         : MERCHANT');
  console.log('      Accès        : /fr/espace-marchand');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); pool.end(); });
