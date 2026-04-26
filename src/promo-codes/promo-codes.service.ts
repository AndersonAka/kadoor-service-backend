import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';

export interface PromoValidationResult {
  valid: boolean;
  reason?: string;
  promo?: {
    id: string;
    code: string;
    description?: string | null;
    discountType: string;
    discountValue: number;
    discount: number;
    finalAmount: number;
  };
}

@Injectable()
export class PromoCodesService {
  constructor(private prisma: PrismaService) {}

  private normalize(code: string): string {
    return code.trim().toUpperCase();
  }

  /**
   * Calcule la réduction effective sur un montant.
   */
  computeDiscount(promo: { discountType: string; discountValue: number }, amount: number): number {
    if (promo.discountType === 'PERCENT') {
      const pct = Math.min(Math.max(promo.discountValue, 0), 100);
      return Math.round((amount * pct) / 100);
    }
    return Math.min(Math.round(promo.discountValue), amount);
  }

  /**
   * Valide un code et retourne le détail de la réduction (utilisé côté front et au moment du paiement).
   */
  async validate(
    rawCode: string,
    amount: number,
    itemType?: 'VEHICLE' | 'APARTMENT',
  ): Promise<PromoValidationResult> {
    const code = this.normalize(rawCode);
    const promo = await this.prisma.promoCode.findUnique({ where: { code } });

    if (!promo) return { valid: false, reason: 'Code promo introuvable' };
    if (!promo.isActive) return { valid: false, reason: 'Code promo désactivé' };

    const now = new Date();
    if (promo.validFrom && now < promo.validFrom) {
      return { valid: false, reason: 'Code promo pas encore actif' };
    }
    if (promo.validUntil && now > promo.validUntil) {
      return { valid: false, reason: 'Code promo expiré' };
    }
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
      return { valid: false, reason: 'Code promo épuisé' };
    }
    if (promo.minAmount != null && amount < promo.minAmount) {
      return {
        valid: false,
        reason: `Montant minimum requis : ${promo.minAmount} FCFA`,
      };
    }
    if (
      itemType &&
      promo.appliesTo !== 'ALL' &&
      promo.appliesTo !== itemType
    ) {
      return { valid: false, reason: 'Code promo non applicable à ce service' };
    }

    const discount = this.computeDiscount(promo, amount);
    return {
      valid: true,
      promo: {
        id: promo.id,
        code: promo.code,
        description: promo.description,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discount,
        finalAmount: Math.max(amount - discount, 0),
      },
    };
  }

  /**
   * Incrémente le compteur d'utilisation (à appeler après confirmation de paiement).
   */
  async incrementUsage(id: string) {
    return this.prisma.promoCode.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
  }

  // ─── CRUD admin ───────────────────────────────────────────────

  async create(dto: CreatePromoCodeDto) {
    const code = this.normalize(dto.code);
    const existing = await this.prisma.promoCode.findUnique({ where: { code } });
    if (existing) throw new ConflictException('Ce code existe déjà');

    const discountType = dto.discountType ?? 'PERCENT';
    const discountValue = dto.discountValue;

    if (discountType === 'PERCENT' && discountValue > 100) {
      throw new BadRequestException('La réduction en pourcentage ne peut excéder 100');
    }

    return this.prisma.promoCode.create({
      data: {
        code,
        description: dto.description ?? null,
        discountType,
        discountValue,
        minAmount: dto.minAmount ?? null,
        maxUses: dto.maxUses ?? null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        isActive: dto.isActive ?? true,
        appliesTo: dto.appliesTo ?? 'ALL',
      },
    });
  }

  async findAll(params: { isActive?: boolean } = {}) {
    return this.prisma.promoCode.findMany({
      where: params.isActive != null ? { isActive: params.isActive } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException('Code promo non trouvé');
    return promo;
  }

  async update(id: string, dto: UpdatePromoCodeDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.code) data.code = this.normalize(dto.code);
    if (dto.validFrom) data.validFrom = new Date(dto.validFrom);
    if (dto.validUntil) data.validUntil = new Date(dto.validUntil);
    return this.prisma.promoCode.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.promoCode.delete({ where: { id } });
  }

  /**
   * Génère un code aléatoire lisible (8 caractères alphanumériques).
   */
  generateCode(prefix?: string): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1 (lisibilité)
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return prefix ? `${prefix.toUpperCase()}-${code}` : code;
  }
}
