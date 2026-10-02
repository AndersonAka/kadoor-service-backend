import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Détermine le rôle applicatif du compte partenaire selon sa catégorie d'activité :
   * GIFT_CARD → commerçant cartes cadeaux (/espace-marchand) ; AUTO/APARTMENT/BOTH → loueur (/espace-partenaire).
   */
  private roleForCategory(category: string): 'MERCHANT' | 'RENTAL_PARTNER' {
    return category === 'GIFT_CARD' ? 'MERCHANT' : 'RENTAL_PARTNER';
  }

  private assertRentRange(min?: number | null, max?: number | null) {
    if (min != null && max != null && min > max) {
      throw new BadRequestException('Le loyer minimum doit être inférieur ou égal au loyer maximum.');
    }
  }

  /** Le formulaire envoie des dates "AAAA-MM-JJ" que Prisma refuse pour un champ DateTime. */
  private normalizeDates(data: Record<string, any>) {
    for (const key of ['birthDate', 'idExpiry', 'registrationDate', 'nextReviewAt']) {
      if (typeof data[key] === 'string') data[key] = new Date(data[key]);
    }
    return data;
  }

  async create(dto: CreatePartnerDto, adminId: string) {
    this.assertRentRange(dto.monthlyRentMin, dto.monthlyRentMax);

    // Vérifier si un partenaire avec cet email existe déjà
    const existing = await this.prisma.partner.findFirst({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Un partenaire avec cet email existe déjà');

    const { merchantPassword, merchantFirstName, merchantLastName, beneficiaries, ...rest } = dto;
    const hashed = merchantPassword ? await bcrypt.hash(merchantPassword, 10) : null;

    // Compte + fiche dans une transaction : si la fiche échoue, aucun compte orphelin ne reste en base.
    return this.prisma.$transaction(async (tx) => {
      // Compte utilisateur (MERCHANT ou RENTAL_PARTNER selon la catégorie) si un mot de passe est fourni
      let userId: string | undefined;
      if (hashed) {
        const existingUser = await tx.user.findUnique({ where: { email: dto.email } });
        if (existingUser) throw new ConflictException('Un compte utilisateur avec cet email existe déjà');

        const user = await tx.user.create({
          data: {
            email: dto.email,
            password: hashed,
            firstName: merchantFirstName || dto.fullName?.split(' ')[0] || dto.legalName || '',
            lastName: merchantLastName || dto.fullName?.split(' ').slice(1).join(' ') || '',
            role: this.roleForCategory(dto.category),
            provider: 'local',
            mustChangePassword: true,
          },
        });
        userId = user.id;
      }

      return tx.partner.create({
        data: this.normalizeDates({
          ...rest,
          beneficiaries: beneficiaries ? JSON.parse(JSON.stringify(beneficiaries)) : undefined,
          userId,
          createdById: adminId || undefined,
        }) as any,
        include: {
          user: { select: { id: true, email: true, role: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          documents: true,
        },
      });
    });
  }

  private readonly createdBySelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
  } as const;

  async findAll(query: { status?: string; category?: string; search?: string }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { legalName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.partner.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, role: true, isActive: true } },
        createdBy: { select: this.createdBySelect },
        documents: true,
        _count: { select: { giftCardTransactions: true } },
      },
    });
  }

  async findOne(id: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true, isActive: true, createdAt: true } },
        createdBy: { select: this.createdBySelect },
        documents: true,
        giftCardTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { giftCard: { select: { code: true, initialAmount: true } } },
        },
        _count: { select: { giftCardTransactions: true } },
      },
    });
    if (!partner) throw new NotFoundException('Partenaire introuvable');
    return partner;
  }

  async update(id: string, dto: UpdatePartnerDto, adminId: string) {
    const partner = await this.findOne(id);
    this.assertRentRange(
      dto.monthlyRentMin !== undefined ? dto.monthlyRentMin : partner.monthlyRentMin,
      dto.monthlyRentMax !== undefined ? dto.monthlyRentMax : partner.monthlyRentMax,
    );

    const { beneficiaries, merchantPassword, merchantFirstName, merchantLastName, ...rest } = dto;

    const data: any = this.normalizeDates({ ...rest });
    if (beneficiaries !== undefined) {
      data.beneficiaries = JSON.parse(JSON.stringify(beneficiaries));
    }

    // Si approbation, enregistrer le validateur
    if (dto.status === 'APPROVED') {
      data.validatedAt = new Date();
      data.validatedById = adminId;
    }

    const hashed = merchantPassword ? await bcrypt.hash(merchantPassword, 10) : null;

    return this.prisma.$transaction(async (tx) => {
      // Réinitialisation du mot de passe (ou création du compte s'il n'existait pas encore)
      if (hashed) {
        if (partner.userId) {
          await tx.user.update({
            where: { id: partner.userId },
            data: { password: hashed, mustChangePassword: true },
          });
        } else {
          const existingUser = await tx.user.findUnique({ where: { email: partner.email } });
          if (existingUser) throw new ConflictException('Un compte utilisateur avec cet email existe déjà');

          const user = await tx.user.create({
            data: {
              email: partner.email,
              password: hashed,
              firstName: merchantFirstName || partner.fullName?.split(' ')[0] || partner.legalName || '',
              lastName: merchantLastName || partner.fullName?.split(' ').slice(1).join(' ') || '',
              role: this.roleForCategory(dto.category ?? partner.category),
              provider: 'local',
              mustChangePassword: true,
            },
          });
          data.userId = user.id;
        }
      }

      return tx.partner.update({
        where: { id },
        data,
        include: { user: { select: { id: true, email: true, role: true } }, documents: true },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.partner.delete({ where: { id } });
  }

  async computeRiskScore(id: string, scores: {
    country: number; shareholders: number; ppe: number;
    funds: number; volume: number; reputation: number; compliance: number;
  }, analyst: string) {
    const total =
      scores.country * 0.20 +
      scores.shareholders * 0.20 +
      scores.ppe * 0.20 +
      scores.funds * 0.15 +
      scores.volume * 0.10 +
      scores.reputation * 0.10 +
      scores.compliance * 0.05;

    const totalPct = (total / 3) * 100;
    const riskLevel = totalPct <= 30 ? 'LOW' : totalPct <= 60 ? 'MEDIUM' : 'HIGH';
    const monthsMap = { LOW: 36, MEDIUM: 18, HIGH: 12 };
    const nextReview = new Date();
    nextReview.setMonth(nextReview.getMonth() + monthsMap[riskLevel]);

    return this.prisma.partner.update({
      where: { id },
      data: {
        riskScoreCountry: scores.country,
        riskScoreShareholders: scores.shareholders,
        riskScorePPE: scores.ppe,
        riskScoreFunds: scores.funds,
        riskScoreVolume: scores.volume,
        riskScoreReputation: scores.reputation,
        riskScoreCompliance: scores.compliance,
        riskTotalScore: totalPct,
        riskLevel,
        kycAnalyst: analyst,
        nextReviewAt: nextReview,
      },
    });
  }
}
