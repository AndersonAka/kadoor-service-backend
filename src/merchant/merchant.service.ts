import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const OTP_TTL_MS = 10 * 60 * 1000;       // 10 minutes
const OTP_COOLDOWN_MS = 2 * 60 * 1000;   // 2 minutes entre demandes
const OTP_MAX_ATTEMPTS = 3;
const OTP_BLOCK_MS = 30 * 60 * 1000;     // blocage 30 min après 3 échecs

@Injectable()
export class MerchantService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /** Récupère le profil partenaire lié à l'utilisateur MERCHANT connecté */
  async getMyProfile(userId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
      include: { documents: true, user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    if (!partner) throw new NotFoundException('Profil partenaire introuvable');
    return partner;
  }

  /** Statistiques du tableau de bord marchand */
  async getDashboardStats(userId: string) {
    const partner = await this.prisma.partner.findUnique({ where: { userId } });
    if (!partner) throw new NotFoundException('Profil partenaire introuvable');

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [totalTx, totalDeducted, monthAgg, recentTx, last7DaysTx] = await Promise.all([
      this.prisma.giftCardTransaction.count({ where: { partnerId: partner.id } }),
      this.prisma.giftCardTransaction.aggregate({
        where: { partnerId: partner.id },
        _sum: { amountDeducted: true },
      }),
      this.prisma.giftCardTransaction.aggregate({
        where: { partnerId: partner.id, createdAt: { gte: startOfMonth } },
        _sum: { amountDeducted: true },
        _count: true,
      }),
      this.prisma.giftCardTransaction.findMany({
        where: { partnerId: partner.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { giftCard: { select: { code: true, recipientName: true } } },
      }),
      this.prisma.giftCardTransaction.findMany({
        where: { partnerId: partner.id, createdAt: { gte: sevenDaysAgo } },
        select: { amountDeducted: true, createdAt: true },
      }),
    ]);

    // Breakdown journalier sur 7 jours
    const dailyStats = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayKey = date.toISOString().split('T')[0];
      const dayTx = last7DaysTx.filter(
        (tx) => new Date(tx.createdAt).toISOString().startsWith(dayKey),
      );
      return {
        date: dayKey,
        label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        count: dayTx.length,
        total: dayTx.reduce((sum, tx) => sum + tx.amountDeducted, 0),
      };
    });

    const totalAmount = totalDeducted._sum.amountDeducted ?? 0;
    const ticketMoyen = totalTx > 0 ? Math.round(totalAmount / totalTx) : 0;

    return {
      totalTransactions: totalTx,
      totalAmountDeducted: totalAmount,
      ticketMoyen,
      monthTransactions: monthAgg._count,
      monthAmountDeducted: monthAgg._sum.amountDeducted ?? 0,
      dailyStats,
      recentTransactions: recentTx,
    };
  }

  /** Masque un email ou téléphone pour l'affichage côté marchand */
  private maskContact(contact: string, type: 'email' | 'sms'): string {
    if (type === 'sms') {
      // +225 07 12 34 56 78 → +225 07 *** ** 78
      return contact.replace(/(\+225\d{2})\d{6}(\d{2})$/, '$1 *** ** $2');
    }
    // email → j***@gmail.com
    const [local, domain] = contact.split('@');
    const masked = local.length <= 2
      ? local[0] + '***'
      : local[0] + '***' + local[local.length - 1];
    return `${masked}@${domain}`;
  }

  /** Génère et envoie un OTP pour sécuriser une transaction */
  async requestOtp(cardCode: string) {
    // 1. Vérifier que la carte est ACTIVE
    const card = await this.lookupGiftCard(cardCode);

    // 2. Charger les infos de contact du détenteur
    const fullCard = await this.prisma.giftCard.findUnique({
      where: { id: card.id },
      select: {
        id: true,
        code: true,
        currentBalance: true,
        recipientPhone: true,
        recipientEmail: true,
        user: { select: { email: true, phone: true } },
      },
    });

    if (!fullCard) throw new NotFoundException('Carte introuvable');

    // 3. Vérifier le cooldown (dernier OTP envoyé < 2 min)
    const lastOtp = await this.prisma.giftCardOtp.findFirst({
      where: { giftCardId: card.id },
      orderBy: { createdAt: 'desc' },
    });
    if (lastOtp?.cooldownUntil && new Date() < new Date(lastOtp.cooldownUntil)) {
      const remainingSec = Math.ceil(
        (new Date(lastOtp.cooldownUntil).getTime() - Date.now()) / 1000,
      );
      throw new BadRequestException(`OTP_COOLDOWN:${remainingSec}`);
    }

    // 4. Invalider les OTP actifs précédents sur cette carte
    await this.prisma.giftCardOtp.updateMany({
      where: { giftCardId: card.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // 5. Générer le code OTP (crypto.randomInt = entropie cryptographique)
    const plainCode = crypto.randomInt(100000, 999999).toString();
    const codeHash = await bcrypt.hash(plainCode, 10);
    const now = Date.now();
    const expiresAt = new Date(now + OTP_TTL_MS);
    const cooldownUntil = new Date(now + OTP_COOLDOWN_MS);

    const otp = await this.prisma.giftCardOtp.create({
      data: { giftCardId: card.id, codeHash, expiresAt, cooldownUntil },
    });

    // 6. Canal de livraison : email uniquement (SMS branché ultérieurement)
    const recipientEmail = fullCard.recipientEmail;
    const fallbackEmail = fullCard.user.email;

    const contactType: 'email' = 'email';
    const contact = recipientEmail || fallbackEmail;

    // 7. Envoyer l'OTP (email uniquement pour l'instant — SMS à brancher ultérieurement)
    this.emailService.sendOtpCode({
      contact,
      contactType,
      otpCode: plainCode,
      cardCode: fullCard.code,
      currentBalance: fullCard.currentBalance,
      expiresAt,
    }).catch(() => {});

    return {
      otpId: otp.id,
      expiresAt: otp.expiresAt,
      maskedContact: this.maskContact(contact, contactType),
      contactType,
    };
  }

  /** Recherche une carte cadeau par son code */
  async lookupGiftCard(code: string) {
    const card = await this.prisma.giftCard.findUnique({
      where: { code: code.toUpperCase() },
      select: {
        id: true,
        code: true,
        status: true,
        initialAmount: true,
        currentBalance: true,
        validUntil: true,
        recipientName: true,
        theme: true,
      },
    });

    if (!card) throw new NotFoundException('Carte cadeau introuvable');

    if (card.status === 'CANCELLED') {
      throw new BadRequestException('Cette carte cadeau a été annulée');
    }
    if (card.status === 'EXPIRED' || new Date(card.validUntil) < new Date()) {
      throw new BadRequestException('Cette carte cadeau a expiré');
    }
    if (card.status === 'USED') {
      throw new BadRequestException('Cette carte cadeau a déjà été entièrement utilisée');
    }
    if (card.status !== 'ACTIVE') {
      throw new BadRequestException('Cette carte cadeau n\'est pas encore active');
    }

    return card;
  }

  /** Déduit un montant d'une carte cadeau (requiert un OTP valide) */
  async deductFromGiftCard(
    userId: string,
    code: string,
    amount: number,
    otpCode: string,
    note?: string,
  ) {
    const partner = await this.prisma.partner.findUnique({ where: { userId } });
    if (!partner) throw new NotFoundException('Profil partenaire introuvable');

    const card = await this.lookupGiftCard(code);

    if (amount <= 0) throw new BadRequestException('Le montant doit être positif');
    if (amount > card.currentBalance) {
      throw new BadRequestException(
        `Solde insuffisant. Solde disponible : ${card.currentBalance} FCFA`,
      );
    }

    // ── Validation OTP ──────────────────────────────────────────────────────────
    const otp = await this.prisma.giftCardOtp.findFirst({
      where: { giftCardId: card.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('Aucun code de sécurité actif. Demandez-en un nouveau.');
    }
    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('OTP_EXPIRED');
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('OTP_MAX_ATTEMPTS');
    }

    const isValid = await bcrypt.compare(otpCode, otp.codeHash);
    if (!isValid) {
      const newAttempts = otp.attempts + 1;
      const blocked = newAttempts >= OTP_MAX_ATTEMPTS;
      await this.prisma.giftCardOtp.update({
        where: { id: otp.id },
        data: {
          attempts: newAttempts,
          ...(blocked ? { usedAt: new Date() } : {}), // invalider après blocage
        },
      });
      if (blocked) throw new BadRequestException('OTP_MAX_ATTEMPTS');
      throw new BadRequestException(`OTP_INVALID:${OTP_MAX_ATTEMPTS - newAttempts}`);
    }
    // ────────────────────────────────────────────────────────────────────────────

    const balanceBefore = card.currentBalance;
    const balanceAfter = balanceBefore - amount;
    const newStatus = balanceAfter === 0 ? 'USED' : 'ACTIVE';
    const receiptRef = `REC-${Date.now().toString(36).toUpperCase()}`;

    // Transaction atomique : déduction + historique + invalidation OTP
    const [updatedCard, transaction] = await this.prisma.$transaction([
      this.prisma.giftCard.update({
        where: { id: card.id },
        data: { currentBalance: balanceAfter, status: newStatus },
      }),
      this.prisma.giftCardTransaction.create({
        data: {
          giftCardId: card.id,
          partnerId: partner.id,
          amountDeducted: amount,
          balanceBefore,
          balanceAfter,
          note,
          receiptRef,
        },
      }),
      this.prisma.giftCardOtp.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { transaction, balanceBefore, balanceAfter, receiptRef };
  }

  /** Historique des transactions du marchand */
  async getTransactionHistory(userId: string, page = 1, limit = 20) {
    const partner = await this.prisma.partner.findUnique({ where: { userId } });
    if (!partner) throw new NotFoundException('Profil partenaire introuvable');

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.giftCardTransaction.findMany({
        where: { partnerId: partner.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { giftCard: { select: { code: true, recipientName: true, initialAmount: true } } },
      }),
      this.prisma.giftCardTransaction.count({ where: { partnerId: partner.id } }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
