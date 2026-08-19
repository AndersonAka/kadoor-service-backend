import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ApartmentsService } from '../apartments/apartments.service';
import { CreateVehicleDto } from '../vehicles/dto/create-vehicle.dto';
import { CreateApartmentDto } from '../apartments/dto/create-apartment.dto';

@Injectable()
export class RentalPartnersService {
  constructor(
    private prisma: PrismaService,
    private vehiclesService: VehiclesService,
    private apartmentsService: ApartmentsService,
  ) {}

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

  /**
   * Soumet un nouveau véhicule au nom du loueur connecté.
   * partnerId et status sont forcés côté serveur (PENDING) : le partenaire ne peut
   * ni s'attribuer un autre partnerId, ni s'auto-valider.
   */
  async submitVehicle(userId: string, dto: CreateVehicleDto) {
    const partner = await this.getPartnerOrThrow(userId);
    const { partnerId: _ignored, ...rest } = dto;
    return this.vehiclesService.create(rest, { partnerId: partner.id, status: 'PENDING' });
  }

  /** Soumet un nouveau logement au nom du loueur connecté (mêmes règles que submitVehicle). */
  async submitApartment(userId: string, dto: CreateApartmentDto) {
    const partner = await this.getPartnerOrThrow(userId);
    const { partnerId: _ignored, ...rest } = dto;
    return this.apartmentsService.create(rest, { partnerId: partner.id, status: 'PENDING' });
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
