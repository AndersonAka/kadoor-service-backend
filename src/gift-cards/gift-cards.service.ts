import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { GeniusPayService } from '../payments/providers/geniuspay/geniuspay.service';
import { ConfigService } from '@nestjs/config';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import { CreateGiftCardBatchDto } from './dto/create-gift-card-batch.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class GiftCardsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private geniusPayService: GeniusPayService,
    private configService: ConfigService,
    private audit: AuditService,
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

  /** Crée la carte et initialise le paiement GeniusPay — flux commande */
  async initiatePayment(dto: CreateGiftCardDto, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

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
      },
    });

    const callbackUrl = this.buildCallbackUrl(card.id);

    const payment = await this.geniusPayService.createPayment({
      amount: dto.initialAmount,
      description: `Carte cadeau Kadoor — ${code}`,
      customer: {
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      },
      success_url: callbackUrl,
      error_url: callbackUrl,
      metadata: {
        paymentType: 'gift_card',
        entityId: card.id,
        userId,
        code: card.code,
        recipientName: dto.recipientName,
      },
    });

    const updated = await this.prisma.giftCard.update({
      where: { id: card.id },
      data: { paymentReference: payment.reference },
    });

    return {
      card: updated,
      authorizationUrl: payment.checkout_url,
      reference: payment.reference,
    };
  }

  /** Vérifie le paiement GeniusPay et active la carte */
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

    const ref = reference || card.paymentReference;
    if (!ref) throw new BadRequestException('Référence de paiement manquante');

    const verification = await this.geniusPayService.getPayment(ref);

    if (verification.status === 'success') {
      const activated = await this.prisma.giftCard.update({
        where: { id: card.id },
        data: { status: 'ACTIVE', validatedAt: new Date(), paymentReference: ref },
        include: { user: { select: { email: true, firstName: true, lastName: true } } },
      });

      this.emailService
        .sendGiftCardValidated({
          ...activated,
          theme: activated.theme ?? 'red',
        })
        .catch(() => {});

      return { card: activated, status: 'success' };
    }

    if (verification.status === 'failed') {
      await this.prisma.giftCard.update({
        where: { id: card.id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Paiement échoué' },
      });
      return { card, status: 'failed' };
    }

    return { card, status: 'pending' };
  }

  async activateByPaymentReference(reference: string) {
    const card = await this.prisma.giftCard.findFirst({
      where: { paymentReference: reference },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
    if (!card) return null;
    if (card.status !== 'PENDING_PAYMENT') return card;

    const activated = await this.prisma.giftCard.update({
      where: { id: card.id },
      data: { status: 'ACTIVE', validatedAt: new Date() },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });

    this.emailService
      .sendGiftCardValidated({
        ...activated,
        theme: activated.theme ?? 'red',
      })
      .catch(() => {});

    await this.audit.record({
      action: 'gift_card.activated_by_payment',
      entityType: 'GiftCard',
      entityId: activated.id,
      outcome: 'SUCCESS',
      source: 'WEBHOOK',
      summary: `Carte cadeau activée (${activated.code})`,
      metadata: { reference },
    });

    return activated;
  }

  async cancelByPaymentReference(reference: string) {
    const card = await this.prisma.giftCard.findFirst({ where: { paymentReference: reference } });
    if (!card || card.status !== 'PENDING_PAYMENT') return;

    await this.prisma.giftCard.update({
      where: { id: card.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Paiement échoué (GeniusPay)' },
    });
    await this.audit.record({
      action: 'gift_card.cancelled_by_payment',
      entityType: 'GiftCard',
      entityId: card.id,
      outcome: 'FAILURE',
      source: 'WEBHOOK',
      summary: `Carte cadeau annulée — paiement échoué (${card.code})`,
      metadata: { reference },
    });
  }

  async activateByEntityId(cardId: string) {
    const card = await this.prisma.giftCard.findUnique({ where: { id: cardId } });
    if (!card?.paymentReference) return null;
    return this.activateByPaymentReference(card.paymentReference);
  }

  async cancelByEntityId(cardId: string) {
    const card = await this.prisma.giftCard.findUnique({ where: { id: cardId } });
    if (!card?.paymentReference) return;
    return this.cancelByPaymentReference(card.paymentReference);
  }

  // ─── Achat groupé ─────────────────────────────────────────────────────────

  async initiateBatchPayment(dto: CreateGiftCardBatchDto, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const totalAmount = dto.quantity * dto.unitAmount;

    const batch = await this.prisma.giftCardBatch.create({
      data: {
        buyerType: dto.buyerType,
        companyName: dto.companyName,
        quantity: dto.quantity,
        unitAmount: dto.unitAmount,
        totalAmount,
        userId,
        status: 'PENDING_PAYMENT',
      },
    });

    const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
    const locale = this.configService.get<string>('WEB_APP_DEFAULT_LOCALE') || 'fr';
    const callbackUrl = `${webAppUrl}/${locale}/payment/callback?giftCardBatchId=${batch.id}`;

    const payment = await this.geniusPayService.createPayment({
      amount: totalAmount,
      description: `Lot de ${dto.quantity} cartes cadeaux Kadoor`,
      customer: {
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      },
      success_url: callbackUrl,
      error_url: callbackUrl,
      metadata: {
        paymentType: 'gift_card_batch',
        entityId: batch.id,
        userId,
        quantity: dto.quantity,
        unitAmount: dto.unitAmount,
      },
    });

    const updated = await this.prisma.giftCardBatch.update({
      where: { id: batch.id },
      data: { paymentReference: payment.reference },
    });

    return {
      batch: updated,
      authorizationUrl: payment.checkout_url,
      reference: payment.reference,
    };
  }

  private async issueBatchCards(batchId: string) {
    const batch = await this.prisma.giftCardBatch.findUnique({
      where: { id: batchId },
      include: { giftCards: true, user: { select: { email: true, firstName: true, lastName: true } } },
    });
    if (!batch) return null;
    if (batch.status === 'ACTIVE' || batch.giftCards.length > 0) return batch;

    const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < batch.quantity; i++) {
      let code: string;
      let unique = false;
      do {
        code = this.generateCode();
        const existing = await this.prisma.giftCard.findUnique({ where: { code } });
        if (!existing) unique = true;
      } while (!unique);

      await this.prisma.giftCard.create({
        data: {
          code,
          initialAmount: batch.unitAmount,
          currentBalance: batch.unitAmount,
          validUntil,
          userId: batch.userId,
          batchId: batch.id,
          status: 'ACTIVE',
          validatedAt: new Date(),
        },
      });
    }

    const activated = await this.prisma.giftCardBatch.update({
      where: { id: batch.id },
      data: { status: 'ACTIVE', validatedAt: new Date() },
      include: { giftCards: true, user: { select: { email: true, firstName: true, lastName: true } } },
    });

    this.emailService.sendGiftCardBatchValidated(activated).catch(() => {});

    return activated;
  }

  async verifyBatchPayment(batchId: string, reference?: string) {
    const batch = await this.prisma.giftCardBatch.findUnique({ where: { id: batchId } });
    if (!batch) throw new NotFoundException('Achat groupé introuvable');

    if (batch.status === 'ACTIVE') {
      const full = await this.prisma.giftCardBatch.findUnique({
        where: { id: batchId },
        include: { giftCards: true },
      });
      return { batch: full, status: 'success' };
    }
    if (batch.status === 'CANCELLED') {
      return { batch, status: 'failed' };
    }

    const ref = reference || batch.paymentReference;
    if (!ref) throw new BadRequestException('Référence de paiement manquante');

    const verification = await this.geniusPayService.getPayment(ref);

    if (verification.status === 'success') {
      const activated = await this.issueBatchCards(batch.id);
      return { batch: activated, status: 'success' };
    }

    if (verification.status === 'failed') {
      await this.prisma.giftCardBatch.update({
        where: { id: batch.id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Paiement échoué' },
      });
      return { batch, status: 'failed' };
    }

    return { batch, status: 'pending' };
  }

  async activateBatchByPaymentReference(reference: string) {
    const batch = await this.prisma.giftCardBatch.findFirst({ where: { paymentReference: reference } });
    if (!batch) return null;
    if (batch.status !== 'PENDING_PAYMENT') return batch;
    const issued = await this.issueBatchCards(batch.id);
    await this.audit.record({
      action: 'gift_card_batch.issued',
      entityType: 'GiftCardBatch',
      entityId: batch.id,
      outcome: 'SUCCESS',
      source: 'WEBHOOK',
      summary: `Lot de ${batch.quantity} cartes cadeaux émis`,
      metadata: { reference },
    });
    return issued;
  }

  async cancelBatchByPaymentReference(reference: string) {
    const batch = await this.prisma.giftCardBatch.findFirst({ where: { paymentReference: reference } });
    if (!batch || batch.status !== 'PENDING_PAYMENT') return;

    await this.prisma.giftCardBatch.update({
      where: { id: batch.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Paiement échoué (GeniusPay)' },
    });
    await this.audit.record({
      action: 'gift_card_batch.cancelled_by_payment',
      entityType: 'GiftCardBatch',
      entityId: batch.id,
      outcome: 'FAILURE',
      source: 'WEBHOOK',
      summary: 'Lot de cartes cadeaux annulé — paiement échoué',
      metadata: { reference },
    });
  }

  async activateBatchByEntityId(batchId: string) {
    const batch = await this.prisma.giftCardBatch.findUnique({ where: { id: batchId } });
    if (!batch?.paymentReference) return null;
    return this.activateBatchByPaymentReference(batch.paymentReference);
  }

  async cancelBatchByEntityId(batchId: string) {
    const batch = await this.prisma.giftCardBatch.findUnique({ where: { id: batchId } });
    if (!batch?.paymentReference) return;
    return this.cancelBatchByPaymentReference(batch.paymentReference);
  }

  /** Mes achats groupés — vue client */
  async findMyBatches(userId: string) {
    return this.prisma.giftCardBatch.findMany({
      where: { userId, status: { not: 'PENDING_PAYMENT' } },
      orderBy: { createdAt: 'desc' },
      include: { giftCards: true },
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
    const updated = await this.prisma.giftCard.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });
    await this.audit.record({
      action: 'gift_card.admin_cancel',
      entityType: 'GiftCard',
      entityId: id,
      outcome: 'SUCCESS',
      source: 'ADMIN_UI',
      summary: `Annulation admin carte cadeau ${card.code}`,
      before: { status: card.status },
      after: { status: 'CANCELLED', cancelReason: reason },
    });
    return updated;
  }
}
