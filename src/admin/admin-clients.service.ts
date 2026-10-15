import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';

export type ClientTier = 'VIP' | 'FIDELE' | 'ACTIF' | 'A_REACTIVER' | 'NOUVEAU' | 'RISQUE' | 'STANDARD';

type RawMetrics = {
  userId: string;
  revenue: number;
  bookings: number;
  cancelCount: number;
  totalCount: number;
  lastBookingAt: Date | null;
  vehicleCount: number;
  apartmentCount: number;
};

@Injectable()
export class AdminClientsService {
  constructor(
    private prisma: PrismaService,
    private promoCodesService: PromoCodesService,
  ) {}

  private periodStart(period: string): Date | null {
    if (period === 'lifetime') return null;
    const months = period === '6m' ? 6 : 12;
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d;
  }

  private recencyScore(recencyDays: number | null): number {
    if (recencyDays == null) return 0;
    if (recencyDays <= 30) return 100;
    if (recencyDays <= 90) return 70;
    if (recencyDays <= 180) return 40;
    return 10;
  }

  private norm(value: number, min: number, max: number): number {
    if (max <= min) return value > 0 ? 100 : 0;
    return Math.round(((value - min) / (max - min)) * 100);
  }

  private computeTier(opts: {
    score: number;
    revenue: number;
    bookings: number;
    recencyDays: number | null;
    cancelRate: number;
    isTop5Revenue: boolean;
  }): ClientTier {
    if (opts.cancelRate > 0.4) return 'RISQUE';
    if (opts.bookings === 1 && opts.recencyDays != null && opts.recencyDays < 60) return 'NOUVEAU';
    if (opts.revenue > 0 && opts.recencyDays != null && opts.recencyDays > 90) return 'A_REACTIVER';
    if (opts.score >= 80 || opts.isTop5Revenue) return 'VIP';
    if (opts.score >= 60) return 'FIDELE';
    if (opts.score >= 40) return 'ACTIF';
    return 'STANDARD';
  }

  private async loadMetrics(period: string): Promise<RawMetrics[]> {
    const since = this.periodStart(period);
    const bookings = await this.prisma.booking.findMany({
      where: since ? { createdAt: { gte: since } } : {},
      select: {
        userId: true,
        status: true,
        totalPrice: true,
        createdAt: true,
        vehicleId: true,
        apartmentId: true,
      },
    });

    const map = new Map<string, RawMetrics>();
    for (const b of bookings) {
      if (!b.userId) continue;
      let row = map.get(b.userId);
      if (!row) {
        row = {
          userId: b.userId,
          revenue: 0,
          bookings: 0,
          cancelCount: 0,
          totalCount: 0,
          lastBookingAt: null,
          vehicleCount: 0,
          apartmentCount: 0,
        };
        map.set(b.userId, row);
      }
      row.totalCount += 1;
      if (b.status === 'CANCELLED') row.cancelCount += 1;
      if (b.status === 'CONFIRMED' || b.status === 'COMPLETED') {
        row.revenue += b.totalPrice || 0;
        row.bookings += 1;
        if (b.vehicleId) row.vehicleCount += 1;
        if (b.apartmentId) row.apartmentCount += 1;
        if (!row.lastBookingAt || b.createdAt > row.lastBookingAt) {
          row.lastBookingAt = b.createdAt;
        }
      }
    }
    return [...map.values()];
  }

  private scoreCohort(metrics: RawMetrics[]) {
    const revenues = metrics.map((m) => m.revenue);
    const bookingCounts = metrics.map((m) => m.bookings);
    const minRev = Math.min(...revenues, 0);
    const maxRev = Math.max(...revenues, 0);
    const minBk = Math.min(...bookingCounts, 0);
    const maxBk = Math.max(...bookingCounts, 0);

    const sortedByRev = [...metrics].sort((a, b) => b.revenue - a.revenue);
    const top5Cutoff = Math.max(1, Math.ceil(sortedByRev.length * 0.05));
    const top5Ids = new Set(sortedByRev.slice(0, top5Cutoff).map((m) => m.userId));

    const now = Date.now();
    return metrics.map((m) => {
      const recencyDays = m.lastBookingAt
        ? Math.floor((now - m.lastBookingAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const cancelRate = m.totalCount > 0 ? m.cancelCount / m.totalCount : 0;
      let score =
        0.4 * this.norm(m.revenue, minRev, maxRev) +
        0.25 * this.norm(m.bookings, minBk, maxBk) +
        0.25 * this.recencyScore(recencyDays) +
        0.1 * (1 - cancelRate) * 100;
      score = Math.round(score);
      if (cancelRate > 0.4) score = Math.min(score, 49);

      const tier = this.computeTier({
        score,
        revenue: m.revenue,
        bookings: m.bookings,
        recencyDays,
        cancelRate,
        isTop5Revenue: top5Ids.has(m.userId),
      });

      const preferred =
        m.vehicleCount === 0 && m.apartmentCount === 0
          ? 'NONE'
          : m.vehicleCount >= m.apartmentCount
            ? 'VEHICLE'
            : 'APARTMENT';

      return {
        userId: m.userId,
        score,
        tier,
        revenue: m.revenue,
        bookings: m.bookings,
        cancelRate: Math.round(cancelRate * 100) / 100,
        recencyDays,
        lastBookingAt: m.lastBookingAt,
        preferred,
        crossSellOpportunity: preferred === 'VEHICLE' || preferred === 'APARTMENT'
          ? preferred === 'VEHICLE' ? 'APARTMENT' : 'VEHICLE'
          : null,
        avgTicket: m.bookings > 0 ? Math.round(m.revenue / m.bookings) : 0,
      };
    });
  }

  async getRanking(query: {
    period?: string;
    sort?: string;
    tier?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const period = query.period || '12m';
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sort = query.sort || 'score';

    const metrics = await this.loadMetrics(period);
    let ranked = this.scoreCohort(metrics);

    if (query.tier) {
      ranked = ranked.filter((r) => r.tier === query.tier);
    }

    const userIds = ranked.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        ...(query.search
          ? {
              OR: [
                { email: { contains: query.search, mode: 'insensitive' as const } },
                { firstName: { contains: query.search, mode: 'insensitive' as const } },
                { lastName: { contains: query.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
        role: 'USER',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    let rows = ranked
      .filter((r) => userMap.has(r.userId))
      .map((r) => ({ ...r, user: userMap.get(r.userId)! }));

    rows.sort((a, b) => {
      if (sort === 'revenue') return b.revenue - a.revenue;
      if (sort === 'bookings') return b.bookings - a.bookings;
      if (sort === 'recency') return (a.recencyDays ?? 9999) - (b.recencyDays ?? 9999);
      return b.score - a.score;
    });

    const total = rows.length;
    const start = (page - 1) * limit;
    const data = rows.slice(start, start + limit);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1, period },
    };
  }

  async getClientSegment(userId: string, period = '12m') {
    const metrics = await this.loadMetrics(period);
    const ranked = this.scoreCohort(metrics);
    const row = ranked.find((r) => r.userId === userId);
    if (!row) {
      return {
        score: 0,
        tier: 'STANDARD' as ClientTier,
        revenue: 0,
        bookings: 0,
        cancelRate: 0,
        recencyDays: null,
        lastBookingAt: null,
        preferred: 'NONE',
        crossSellOpportunity: null,
        avgTicket: 0,
        explanation: 'Aucune réservation confirmée sur la période',
      };
    }
    const explanation = this.explain(row);
    return { ...row, explanation };
  }

  private explain(row: {
    tier: ClientTier;
    score: number;
    revenue: number;
    bookings: number;
    recencyDays: number | null;
  }): string {
    const ca = `${Math.round(row.revenue).toLocaleString('fr-FR')} FCFA`;
    const rec = row.recencyDays != null ? `dernière résa il y a ${row.recencyDays} j` : 'pas de résa récente';
    return `${row.tier} (score ${row.score}) — ${row.bookings} résa, ${ca}, ${rec}`;
  }

  async listAssignedPromos(userId: string) {
    return this.prisma.promoCode.findMany({
      where: { assignedUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async offerPromo(
    userId: string,
    dto: {
      discountType?: 'PERCENT' | 'FIXED';
      discountValue?: number;
      appliesTo?: 'ALL' | 'VEHICLE' | 'APARTMENT';
      validDays?: number;
      description?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Client non trouvé');

    const segment = await this.getClientSegment(userId);
    const tierDefaults: Record<string, number> = {
      VIP: 15,
      FIDELE: 10,
      ACTIF: 8,
      A_REACTIVER: 12,
      NOUVEAU: 10,
      RISQUE: 5,
      STANDARD: 8,
    };

    const discountType = dto.discountType ?? 'PERCENT';
    let discountValue = dto.discountValue ?? tierDefaults[segment.tier] ?? 10;
    if (discountType === 'PERCENT') {
      const caps: Record<string, number> = {
        VIP: 15,
        FIDELE: 10,
        ACTIF: 8,
        A_REACTIVER: 12,
        NOUVEAU: 10,
        RISQUE: 5,
        STANDARD: 8,
      };
      discountValue = Math.min(discountValue, caps[segment.tier] ?? 10);
    }

    const appliesTo =
      dto.appliesTo
      ?? (segment.crossSellOpportunity as 'VEHICLE' | 'APARTMENT' | null)
      ?? 'ALL';

    const validDays = dto.validDays ?? (segment.tier === 'VIP' ? 14 : 30);
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    const code = this.promoCodesService.generateCode('KADOOR');
    const promo = await this.promoCodesService.create({
      code,
      description:
        dto.description
        || `Code ${segment.tier} offert à ${user.firstName || ''} ${user.lastName || ''}`.trim(),
      discountType,
      discountValue,
      maxUses: 1,
      validUntil: validUntil.toISOString(),
      isActive: true,
      appliesTo: appliesTo === 'VEHICLE' || appliesTo === 'APARTMENT' ? appliesTo : 'ALL',
      assignedUserId: userId,
    });

    return { promo, segment };
  }
}
