import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ApartmentsService } from '../apartments/apartments.service';
import { CreateVehicleDto } from '../vehicles/dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../vehicles/dto/update-vehicle.dto';
import { CreateApartmentDto } from '../apartments/dto/create-apartment.dto';
import { UpdateApartmentDto } from '../apartments/dto/update-apartment.dto';
import { ListingKind, ListingModerationService } from '../listings/listing-moderation.service';

@Injectable()
export class RentalPartnersService {
  constructor(
    private prisma: PrismaService,
    private vehiclesService: VehiclesService,
    private apartmentsService: ApartmentsService,
    private moderation: ListingModerationService,
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

  private partnerName(partner: { legalName: string | null; fullName: string | null; email: string }) {
    return partner.legalName || partner.fullName || partner.email;
  }

  /** Un partenaire ne soumet que les biens correspondant à son activité (AUTO / APARTMENT / BOTH). */
  private assertCategory(partner: { category: string }, kind: ListingKind) {
    const expected = kind === 'vehicle' ? 'AUTO' : 'APARTMENT';
    if (partner.category !== 'BOTH' && partner.category !== expected) {
      throw new ForbiddenException(
        kind === 'vehicle'
          ? "Votre compte n'est pas habilité à proposer des véhicules."
          : "Votre compte n'est pas habilité à proposer des logements.",
      );
    }
  }

  /**
   * Soumet un nouveau véhicule au nom du loueur connecté.
   * partnerId et status sont forcés côté serveur (PENDING) : le partenaire ne peut
   * ni s'attribuer un autre partnerId, ni s'auto-valider.
   */
  async submitVehicle(userId: string, dto: CreateVehicleDto) {
    const partner = await this.getPartnerOrThrow(userId);
    this.assertCategory(partner, 'vehicle');
    const { partnerId: _ignored, ...rest } = dto;
    const vehicle = await this.vehiclesService.create(rest, { partnerId: partner.id, status: 'PENDING' });
    await this.moderation.notifyAdminsSubmission('vehicle', vehicle.title, this.partnerName(partner));
    return vehicle;
  }

  /** Soumet un nouveau logement au nom du loueur connecté (mêmes règles que submitVehicle). */
  async submitApartment(userId: string, dto: CreateApartmentDto) {
    const partner = await this.getPartnerOrThrow(userId);
    this.assertCategory(partner, 'apartment');
    const { partnerId: _ignored, ...rest } = dto;
    const apartment = await this.apartmentsService.create(rest, { partnerId: partner.id, status: 'PENDING' });
    await this.moderation.notifyAdminsSubmission('apartment', apartment.title, this.partnerName(partner));
    return apartment;
  }

  /**
   * Modification d'un bien par son propriétaire. Toute modification du contenu renvoie le bien
   * en validation (PENDING, retiré du public) ; seul le basculement « disponible / indisponible »
   * est appliqué directement, pour que le partenaire puisse gérer ses indisponibilités.
   */
  async updateMyVehicle(userId: string, id: string, dto: UpdateVehicleDto) {
    const partner = await this.getPartnerOrThrow(userId);
    const current = await this.prisma.vehicle.findFirst({ where: { id, partnerId: partner.id } });
    if (!current) throw new NotFoundException('Véhicule introuvable');

    const data = this.partnerEditableData(dto);
    const needsReview = this.needsReview(data);
    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: needsReview ? { ...data, status: 'PENDING', rejectionReason: null } : data,
    });
    if (needsReview) {
      await this.moderation.notifyAdminsSubmission('vehicle', updated.title, this.partnerName(partner), true);
    }
    return updated;
  }

  async updateMyApartment(userId: string, id: string, dto: UpdateApartmentDto) {
    const partner = await this.getPartnerOrThrow(userId);
    const current = await this.prisma.apartment.findFirst({ where: { id, partnerId: partner.id } });
    if (!current) throw new NotFoundException('Logement introuvable');

    const data = this.partnerEditableData(dto);
    const needsReview = this.needsReview(data);
    const updated = await this.prisma.apartment.update({
      where: { id },
      data: needsReview ? { ...data, status: 'PENDING', rejectionReason: null } : data,
    });
    if (needsReview) {
      await this.moderation.notifyAdminsSubmission('apartment', updated.title, this.partnerName(partner), true);
    }
    return updated;
  }

  /** Retrait d'un bien jamais publié (en attente ou refusé) et sans réservation. Un bien en ligne passe par l'admin. */
  async removeMyVehicle(userId: string, id: string) {
    const partner = await this.getPartnerOrThrow(userId);
    const current = await this.prisma.vehicle.findFirst({
      where: { id, partnerId: partner.id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!current) throw new NotFoundException('Véhicule introuvable');
    this.assertWithdrawable(current.status, current._count.bookings);
    await this.prisma.vehicle.delete({ where: { id } });
    return { id };
  }

  async removeMyApartment(userId: string, id: string) {
    const partner = await this.getPartnerOrThrow(userId);
    const current = await this.prisma.apartment.findFirst({
      where: { id, partnerId: partner.id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!current) throw new NotFoundException('Logement introuvable');
    this.assertWithdrawable(current.status, current._count.bookings);
    await this.prisma.apartment.delete({ where: { id } });
    return { id };
  }

  /** Le partenaire ne choisit ni le statut de validation, ni le motif, ni le propriétaire. */
  private partnerEditableData<T extends { status?: unknown; rejectionReason?: unknown; partnerId?: unknown }>(dto: T) {
    const { status: _s, rejectionReason: _r, partnerId: _p, ...data } = dto;
    return data;
  }

  private needsReview(data: object) {
    return Object.keys(data).some((key) => key !== 'isAvailable');
  }

  private assertWithdrawable(status: string, bookings: number) {
    if (status === 'APPROVED') {
      throw new BadRequestException('Ce bien est en ligne : contactez Kadoor Service pour le retirer.');
    }
    if (bookings > 0) {
      throw new BadRequestException('Ce bien a déjà des réservations et ne peut pas être supprimé.');
    }
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
