import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MerchantService {
  constructor(private prisma: PrismaService) {}

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

  /** Déduit un montant d'une carte cadeau */
  async deductFromGiftCard(userId: string, code: string, amount: number, note?: string) {
    const partner = await this.prisma.partner.findUnique({ where: { userId } });
    if (!partner) throw new NotFoundException('Profil partenaire introuvable');

    const card = await this.lookupGiftCard(code);

    if (amount <= 0) throw new BadRequestException('Le montant doit être positif');
    if (amount > card.currentBalance) {
      throw new BadRequestException(
        `Solde insuffisant. Solde disponible : ${card.currentBalance} FCFA`,
      );
    }

    const balanceBefore = card.currentBalance;
    const balanceAfter = balanceBefore - amount;
    const newStatus = balanceAfter === 0 ? 'USED' : 'ACTIVE';
    const receiptRef = `REC-${Date.now().toString(36).toUpperCase()}`;

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
