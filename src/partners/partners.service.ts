import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import { ApplyPartnerDto } from './dto/apply-partner.dto';
import { ListingStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PartnersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private email: EmailService,
    private inApp: InAppNotificationsService,
  ) {}

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

      const created = await tx.partner.create({
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
      return created;
    }).then(async (created) => {
      await this.audit.record({
        actorId: adminId,
        action: 'partner.create',
        entityType: 'Partner',
        entityId: created.id,
        outcome: 'SUCCESS',
        source: 'ADMIN_UI',
        summary: `Création partenaire ${created.legalName || created.fullName || created.email}`,
        after: { email: created.email, category: created.category, status: created.status },
      });
      return created;
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
    const issueAccount =
      dto.status === 'APPROVED' && !partner.userId && !partner.createdById && !hashed;
    const issuedPassword = issueAccount ? this.generateTemporaryPassword() : null;
    const passwordHash = hashed || (issuedPassword ? await bcrypt.hash(issuedPassword, 10) : null);

    return this.prisma.$transaction(async (tx) => {
      // Réinitialisation du mot de passe (ou création du compte s'il n'existait pas encore)
      if (passwordHash) {
        if (partner.userId) {
          await tx.user.update({
            where: { id: partner.userId },
            data: { password: passwordHash, mustChangePassword: true },
          });
        } else {
          const existingUser = await tx.user.findUnique({ where: { email: partner.email } });
          if (existingUser) throw new ConflictException('Un compte utilisateur avec cet email existe déjà');

          const user = await tx.user.create({
            data: {
              email: partner.email,
              password: passwordHash,
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
    }).then(async (updated) => {
      await this.audit.record({
        actorId: adminId,
        action: dto.status ? 'partner.status_update' : 'partner.update',
        entityType: 'Partner',
        entityId: id,
        outcome: 'SUCCESS',
        source: 'ADMIN_UI',
        summary: dto.status
          ? `Statut partenaire → ${dto.status}`
          : `Modification partenaire ${updated.legalName || updated.fullName || updated.email}`,
        before: { status: partner.status },
        after: { status: updated.status, email: updated.email },
      });
      if (issuedPassword) {
        const name = updated.fullName || updated.legalName || '';
        this.email
          .sendPartnerAccessEmail(updated.email, name, issuedPassword)
          .catch((err) => console.error('[PartnersService] Access email error:', err));
      }
      return updated;
    });
  }

  async remove(id: string) {
    const partner = await this.findOne(id);
    await this.prisma.partner.delete({ where: { id } });
    await this.audit.record({
      action: 'partner.delete',
      entityType: 'Partner',
      entityId: id,
      outcome: 'SUCCESS',
      source: 'ADMIN_UI',
      summary: `Suppression partenaire ${partner.legalName || partner.fullName || partner.email}`,
      before: { email: partner.email, status: partner.status },
    });
    return { success: true };
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    return Array.from(randomBytes(14), (n) => chars[n % chars.length]).join('');
  }

  private assertUploadedImages(urls: string[]) {
    if (urls.length < 9 || urls.length > 10) {
      throw new BadRequestException('Le premier bien doit comporter entre 9 et 10 photos.');
    }
    for (const url of urls) {
      let host = '';
      try {
        host = new URL(url).hostname;
      } catch {
        throw new BadRequestException('Une photo est invalide.');
      }
      if (!host.endsWith('blob.vercel-storage.com')) {
        throw new BadRequestException('Les photos doivent être téléversées depuis le formulaire (JPG, PNG ou WEBP, 4,5 Mo maximum).');
      }
    }
  }

  /**
   * Inscription publique : fiche en attente, premier bien invisible, aucun mot de passe.
   */
  async apply(dto: ApplyPartnerDto) {
    const email = dto.email.trim().toLowerCase();
    const isCompany = dto.partnerType === 'COMPANY';
    if (isCompany) {
      if (!dto.legalName?.trim() || !dto.registrationNumber?.trim() || !dto.registrationDate) {
        throw new BadRequestException('La raison sociale, le RCCM et la date d\'établissement sont obligatoires.');
      }
    } else if (!dto.fullName?.trim()) {
      throw new BadRequestException('Le nom complet est obligatoire.');
    }

    const listing = dto.listing;
    if (dto.category === 'AUTO' && listing.kind !== 'vehicle') {
      throw new BadRequestException('Le premier bien doit être un véhicule.');
    }
    if (dto.category === 'APARTMENT' && listing.kind !== 'apartment') {
      throw new BadRequestException('Le premier bien doit être un appartement.');
    }
    this.assertUploadedImages(listing.images);

    if (listing.kind === 'vehicle' && !listing.location?.trim()) {
      throw new BadRequestException('La ville du véhicule est obligatoire.');
    }
    if (listing.kind === 'apartment') {
      if (!listing.city?.trim() || !listing.address?.trim()) {
        throw new BadRequestException('La ville et l\'adresse du logement sont obligatoires.');
      }
      if (listing.pricePerNight == null || listing.bedrooms == null || listing.bathrooms == null) {
        throw new BadRequestException('Le prix par nuit, les chambres et les salles de bain sont obligatoires.');
      }
    }

    const [existingPartner, existingUser] = await Promise.all([
      this.prisma.partner.findFirst({ where: { email } }),
      this.prisma.user.findUnique({ where: { email } }),
    ]);
    if (existingPartner) throw new ConflictException('Un partenaire avec cet e-mail existe déjà.');
    if (existingUser) throw new ConflictException('Un compte existe déjà avec cet e-mail.');

    const name = (isCompany ? dto.legalName : dto.fullName)?.trim() || email;
    const showAuto = dto.category === 'AUTO' || dto.category === 'BOTH';
    const showAppart = dto.category === 'APARTMENT' || dto.category === 'BOTH';

    const created = await this.prisma.$transaction(async (tx) => {
      const partner = await tx.partner.create({
        data: {
          partnerType: dto.partnerType,
          category: dto.category,
          status: 'PENDING',
          email,
          phone: dto.phone.trim(),
          phone2: dto.phone2?.trim() || null,
          address: dto.address.trim(),
          website: dto.website?.trim() || null,
          fullName: isCompany ? null : dto.fullName?.trim(),
          legalName: isCompany ? dto.legalName?.trim() : null,
          registrationNumber: isCompany ? dto.registrationNumber?.trim() : null,
          registrationDate: isCompany && dto.registrationDate ? new Date(dto.registrationDate) : null,
          vehicleCount: showAuto && dto.vehicleCount != null ? dto.vehicleCount : null,
          vehicleTypes: showAuto ? dto.vehicleTypes || [] : [],
          autoCompliance: showAuto ? dto.autoCompliance || [] : [],
          geoZones: showAuto ? dto.geoZones?.trim() || null : null,
          pickupPoints: showAuto ? dto.pickupPoints?.trim() || null : null,
          unitCount: showAppart && dto.unitCount != null ? dto.unitCount : null,
          housingTypes: showAppart ? dto.housingTypes || [] : [],
          housingTypeOther: showAppart ? dto.housingTypeOther?.trim() || null : null,
          mainCities: showAppart ? dto.mainCities?.trim() || null : null,
        },
      });

      if (listing.kind === 'vehicle') {
        await tx.vehicle.create({
          data: {
            title: listing.title.trim(),
            description: listing.description.trim(),
            type: listing.type.trim(),
            location: listing.location?.trim() || null,
            images: listing.images,
            partnerId: partner.id,
            status: ListingStatus.PENDING,
            isAvailable: true,
          },
        });
      } else {
        await tx.apartment.create({
          data: {
            title: listing.title.trim(),
            description: listing.description.trim(),
            type: listing.type.trim(),
            address: listing.address!.trim(),
            city: listing.city!.trim(),
            pricePerNight: listing.pricePerNight!,
            bedrooms: listing.bedrooms!,
            bathrooms: listing.bathrooms!,
            area: listing.area ?? 0,
            images: listing.images,
            partnerId: partner.id,
            status: ListingStatus.PENDING,
            isAvailable: true,
          },
        });
      }

      return partner;
    });

    await this.audit.record({
      action: 'partner.apply',
      entityType: 'Partner',
      entityId: created.id,
      outcome: 'SUCCESS',
      source: 'API',
      summary: `Demande publique — ${name}`,
      after: { email, category: dto.category, listing: listing.kind },
    });

    this.email.sendPartnerApplicationReceived(email, name).catch((err) =>
      console.error('[PartnersService] Application email error:', err),
    );
    this.inApp.notifyPartnerApplication(name).catch((err) =>
      console.error('[PartnersService] Application notif error:', err),
    );

    return { id: created.id, status: created.status };
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
