import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PaystackService } from '../reservations/paystack.service';
import { ConfigService } from '@nestjs/config';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GiftCardsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private paystackService: PaystackService,
    private configService: ConfigService,
  ) {}

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `KDS-${seg()}-${seg()}`;
  }

  private buildCallbackUrl(cardId: string): string {
    const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
    const locale = this.configService.get<string>('WEB_APP_DEFAULT_LOCALE') || 'fr';
    return `${webAppUrl}/${locale}/payment/callback?giftCardId=${cardId}`;
  }

  /** Crée la carte et initialise le paiement Paystack — flux commande */
  async initiatePayment(dto: CreateGiftCardDto, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Générer un code unique
    let code: string;
    let unique = false;
    do {
      code = this.generateCode();
      const existing = await this.prisma.giftCard.findUnique({ where: { code } });
      if (!existing) unique = true;
    } while (!unique);

    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const paystackReference = `GC-${uuidv4()}`;

    // Créer la carte en PENDING_PAYMENT
    const card = await this.prisma.giftCard.create({
      data: {
        code,
        initialAmount: dto.initialAmount,
        currentBalance: dto.initialAmount,
        theme: dto.theme,
        recipientName: dto.recipientName,
        recipientEmail: dto.recipientEmail,
        recipientPhone: dto.recipientPhone,
        senderMessage: dto.senderMessage,
        validUntil,
        userId,
        status: 'PENDING_PAYMENT',
        paystackReference,
      },
    });

    const callbackUrl = this.buildCallbackUrl(card.id);

    const paystack = await this.paystackService.initializeTransaction({
      email: user.email,
      amount: dto.initialAmount,
      reference: paystackReference,
      callback_url: callbackUrl,
      metadata: {
        type: 'GIFT_CARD',
        giftCardId: card.id,
        code: card.code,
        recipientName: dto.recipientName,
      },
    });

    return {
      card,
      authorizationUrl: paystack.authorization_url,
      reference: paystackReference,
    };
  }

  /** Vérifie le paiement Paystack et active la carte */
  async verifyPayment(cardId: string, reference?: string) {
    const card = await this.prisma.giftCard.findUnique({
      where: { id: cardId },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
    if (!card) throw new NotFoundException('Carte cadeau introuvable');

    if (card.status === 'ACTIVE') {
      return { card, status: 'success' };
    }
    if (card.status === 'CANCELLED') {
      return { card, status: 'failed' };
    }

    const ref = reference || card.paystackReference;
    if (!ref) throw new BadRequestException('Référence Paystack manquante');

    const verification = await this.paystackService.verifyTransaction(ref);

    if (verification.status === 'success') {
      const activated = await this.prisma.giftCard.update({
        where: { id: card.id },
        data: { status: 'ACTIVE', validatedAt: new Date() },
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      });

      this.emailService.sendGiftCardValidated({
        ...activated,
        theme: activated.theme ?? 'red',
      }).catch(() => {});

      return { card: activated, status: 'success' };
    }

    if (verification.status === 'failed' || verification.status === 'abandoned') {
      await this.prisma.giftCard.update({
        where: { id: card.id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Paiement échoué' },
      });
      return { card, status: 'failed' };
    }

    return { card, status: 'pending' };
  }

  /** Appelé depuis le webhook Paystack pour activer une carte */
  async activateByPaystack(reference: string) {
    const card = await this.prisma.giftCard.findFirst({
      where: { paystackReference: reference },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
    if (!card) return null;

    if (card.status !== 'PENDING_PAYMENT') return card;

    const activated = await this.prisma.giftCard.update({
      where: { id: card.id },
      data: { status: 'ACTIVE', validatedAt: new Date() },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });

    this.emailService.sendGiftCardValidated({
      ...activated,
      theme: activated.theme ?? 'red',
    }).catch(() => {});

    return activated;
  }

  /** Annule une carte PENDING_PAYMENT suite à un paiement échoué (webhook) */
  async cancelByPaystack(reference: string) {
    const card = await this.prisma.giftCard.findFirst({ where: { paystackReference: reference } });
    if (!card || card.status !== 'PENDING_PAYMENT') return;

    await this.prisma.giftCard.update({
      where: { id: card.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Paiement échoué (Paystack)' },
    });
  }

  /** Toutes les cartes — vue admin */
  async findAll(query: { status?: string; search?: string; page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { code: { contains: query.search.toUpperCase() } },
        { recipientName: { contains: query.search, mode: 'insensitive' } },
        { recipientEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.giftCard.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          _count: { select: { transactions: true } },
        },
      }),
      this.prisma.giftCard.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Statistiques admin cartes cadeaux */
  async getAdminStats() {
    const [total, active, used, cancelled, pendingPayment, amountAgg, activeAgg] = await Promise.all([
      this.prisma.giftCard.count(),
      this.prisma.giftCard.count({ where: { status: 'ACTIVE' } }),
      this.prisma.giftCard.count({ where: { status: 'USED' } }),
      this.prisma.giftCard.count({ where: { status: 'CANCELLED' } }),
      this.prisma.giftCard.count({ where: { status: 'PENDING_PAYMENT' } }),
      this.prisma.giftCard.aggregate({ _sum: { initialAmount: true } }),
      this.prisma.giftCard.aggregate({
        where: { status: { in: ['ACTIVE', 'USED'] } },
        _sum: { initialAmount: true, currentBalance: true },
      }),
    ]);

    const totalRevenue = amountAgg._sum.initialAmount ?? 0;
    const activeBalance = activeAgg._sum.currentBalance ?? 0;
    const totalDeducted = (activeAgg._sum.initialAmount ?? 0) - activeBalance;

    return { total, active, used, cancelled, pendingPayment, totalRevenue, totalDeducted, activeBalance };
  }

  async findOne(id: string) {
    const card = await this.prisma.giftCard.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          include: { partner: { select: { id: true, legalName: true, fullName: true, email: true } } },
        },
      },
    });
    if (!card) throw new NotFoundException('Carte cadeau introuvable');
    return card;
  }

  /** Mes cartes — vue client */
  async findMyCards(userId: string) {
    return this.prisma.giftCard.findMany({
      where: { userId, status: { not: 'PENDING_PAYMENT' } },
      orderBy: { createdAt: 'desc' },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { partner: { select: { legalName: true, fullName: true } } },
        },
      },
    });
  }

  /** Vue publique d'une carte par son code — pas de JWT requis */
  async findByCodePublic(code: string) {
    const card = await this.prisma.giftCard.findUnique({
      where: { code: code.toUpperCase() },
      select: {
        code: true,
        status: true,
        initialAmount: true,
        currentBalance: true,
        theme: true,
        recipientName: true,
        senderMessage: true,
        validFrom: true,
        validUntil: true,
        validatedAt: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          select: {
            amountDeducted: true,
            balanceBefore: true,
            balanceAfter: true,
            createdAt: true,
          },
        },
      },
    });
    if (!card) throw new NotFoundException('Carte cadeau introuvable');
    return card;
  }

  async cancel(id: string, reason?: string) {
    const card = await this.findOne(id);
    if (!['ACTIVE', 'PENDING_PAYMENT'].includes(card.status)) {
      throw new BadRequestException('Seules les cartes actives ou en attente peuvent être annulées');
    }
    return this.prisma.giftCard.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });
  }
}
