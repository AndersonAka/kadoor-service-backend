import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePartnerDto, adminId: string) {
    // Vérifier si un partenaire avec cet email existe déjà
    const existing = await this.prisma.partner.findFirst({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Un partenaire avec cet email existe déjà');

    // Créer le compte utilisateur MERCHANT si un mot de passe est fourni
    let userId: string | undefined;
    if (dto.merchantPassword) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingUser) throw new ConflictException('Un compte utilisateur avec cet email existe déjà');

      const hashed = await bcrypt.hash(dto.merchantPassword, 10);
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashed,
          firstName: dto.merchantFirstName || dto.fullName?.split(' ')[0] || dto.legalName || '',
          lastName: dto.merchantLastName || dto.fullName?.split(' ').slice(1).join(' ') || '',
          role: 'MERCHANT',
          provider: 'local',
        },
      });
      userId = user.id;
    }

    const { merchantPassword, merchantFirstName, merchantLastName, beneficiaries, ...rest } = dto;

    return this.prisma.partner.create({
      data: {
        ...rest,
        beneficiaries: beneficiaries ? JSON.parse(JSON.stringify(beneficiaries)) : undefined,
        userId,
      },
      include: { user: { select: { id: true, email: true, role: true } }, documents: true },
    });
  }

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

    const { beneficiaries, merchantPassword, merchantFirstName, merchantLastName, ...rest } = dto;

    const data: any = { ...rest };
    if (beneficiaries !== undefined) {
      data.beneficiaries = JSON.parse(JSON.stringify(beneficiaries));
    }

    // Si approbation, enregistrer le validateur
    if (dto.status === 'APPROVED') {
      data.validatedAt = new Date();
      data.validatedById = adminId;
    }

    // Réinitialisation du mot de passe marchand (ou création du compte s'il n'existait pas encore)
    if (merchantPassword) {
      const hashed = await bcrypt.hash(merchantPassword, 10);
      if (partner.userId) {
        await this.prisma.user.update({
          where: { id: partner.userId },
          data: { password: hashed },
        });
      } else {
        const existingUser = await this.prisma.user.findUnique({ where: { email: partner.email } });
        if (existingUser) throw new ConflictException('Un compte utilisateur avec cet email existe déjà');

        const user = await this.prisma.user.create({
          data: {
            email: partner.email,
            password: hashed,
            firstName: merchantFirstName || partner.fullName?.split(' ')[0] || partner.legalName || '',
            lastName: merchantLastName || partner.fullName?.split(' ').slice(1).join(' ') || '',
            role: 'MERCHANT',
            provider: 'local',
          },
        });
        data.userId = user.id;
      }
    }

    return this.prisma.partner.update({
      where: { id },
      data,
      include: { user: { select: { id: true, email: true, role: true } }, documents: true },
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
