import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GiftCardsService {
  constructor(private prisma: PrismaService) {}

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `KDS-${seg()}-${seg()}`;
  }

  async create(dto: CreateGiftCardDto, userId: string) {
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

    return this.prisma.giftCard.create({
      data: {
        code,
        initialAmount: dto.initialAmount,
        currentBalance: dto.initialAmount,
        theme: dto.theme,
        recipientName: dto.recipientName,
        recipientEmail: dto.recipientEmail,
        senderMessage: dto.senderMessage,
        validUntil,
        userId,
        status: 'PENDING',
      },
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
      where: { userId },
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

  async validate(id: string, adminId: string) {
    await this.findOne(id);
    return this.prisma.giftCard.update({
      where: { id },
      data: { status: 'ACTIVE', validatedAt: new Date(), validatedById: adminId },
    });
  }

  async cancel(id: string, reason?: string) {
    await this.findOne(id);
    return this.prisma.giftCard.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });
  }
}
