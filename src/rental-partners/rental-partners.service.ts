import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RentalPartnersService {
  constructor(private prisma: PrismaService) {}

  private async getPartnerOrThrow(userId: string) {
    const partner = await this.prisma.partner.findUnique({ where: { userId } });
    if (!partner) throw new NotFoundException('Profil partenaire introuvable');
    return partner;
  }

  /** Profil partenaire du loueur connecté */
  async getMyProfile(userId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
      include: { documents: true, user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    if (!partner) throw new NotFoundException('Profil partenaire introuvable');
    return partner;
  }

  /** Statistiques du tableau de bord loueur : flotte, réservations reçues, revenus */
  async getDashboardStats(userId: string) {
    const partner = await this.getPartnerOrThrow(userId);

    const [vehicleCount, apartmentCount, vehicles, apartments] = await Promise.all([
      this.prisma.vehicle.count({ where: { partnerId: partner.id } }),
      this.prisma.apartment.count({ where: { partnerId: partner.id } }),
      this.prisma.vehicle.findMany({ where: { partnerId: partner.id }, select: { id: true } }),
      this.prisma.apartment.findMany({ where: { partnerId: partner.id }, select: { id: true } }),
    ]);

    const vehicleIds = vehicles.map((v) => v.id);
    const apartmentIds = apartments.map((a) => a.id);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const bookingWhere = {
      OR: [
        { vehicleId: { in: vehicleIds } },
        { apartmentId: { in: apartmentIds } },
      ],
    };

    const [totalBookings, monthBookings, confirmedAgg, recentBookings] = await Promise.all([
      this.prisma.booking.count({ where: bookingWhere }),
      this.prisma.booking.count({ where: { ...bookingWhere, createdAt: { gte: startOfMonth } } }),
      this.prisma.booking.aggregate({
        where: { ...bookingWhere, status: { in: ['CONFIRMED', 'COMPLETED'] } },
        _sum: { totalPrice: true },
      }),
      this.prisma.booking.findMany({
        where: bookingWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          vehicle: { select: { title: true } },
          apartment: { select: { title: true } },
          user: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      vehicleCount,
      apartmentCount,
      totalBookings,
      monthBookings,
      totalRevenue: confirmedAgg._sum.totalPrice ?? 0,
      recentBookings,
    };
  }

  /** Véhicules rattachés au loueur connecté */
  async getMyVehicles(userId: string) {
    const partner = await this.getPartnerOrThrow(userId);
    return this.prisma.vehicle.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { bookings: true } } },
    });
  }

  /** Logements rattachés au loueur connecté */
  async getMyApartments(userId: string) {
    const partner = await this.getPartnerOrThrow(userId);
    return this.prisma.apartment.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { bookings: true } } },
    });
  }

  /** Réservations reçues sur les biens du loueur connecté */
  async getMyBookings(userId: string, page = 1, limit = 20) {
    const partner = await this.getPartnerOrThrow(userId);

    const [vehicleIds, apartmentIds] = await Promise.all([
      this.prisma.vehicle.findMany({ where: { partnerId: partner.id }, select: { id: true } }).then((v) => v.map((x) => x.id)),
      this.prisma.apartment.findMany({ where: { partnerId: partner.id }, select: { id: true } }).then((a) => a.map((x) => x.id)),
    ]);

    const where = {
      OR: [
        { vehicleId: { in: vehicleIds } },
        { apartmentId: { in: apartmentIds } },
      ],
    };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          vehicle: { select: { title: true } },
          apartment: { select: { title: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
