import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { UpsertVehicleTypePricingDto } from './dto/upsert-vehicle-type-pricing.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ListingModerationService } from '../listings/listing-moderation.service';
import { ListingStatus, Prisma, Vehicle, VehicleTypePricing } from '@prisma/client';

/** Champs tarifaires exposés aux clients (forme historique `typePricing`). */
export type VehiclePricingSnapshot = {
  tier1MileageDailyAmount: number;
  tier2MileageDailyAmount: number;
  tier3MileageDailyAmount: number;
  overagePricePerKm: number;
  insuranceAmount: number;
  insuranceDiscountPercent: number;
  /** Présent uniquement pour les grilles-modèles par type */
  vehicleType?: string;
};

export type VehicleWithPricing = Vehicle & {
  typePricing: VehiclePricingSnapshot;
  fromPriceTier1: number;
};

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private moderation: ListingModerationService,
  ) {}

  /** Montant journalier du forfait « moins de 150 km/j », affichage « à partir de » */
  static tier1DailyCost(p: Pick<VehiclePricingSnapshot, 'tier1MileageDailyAmount'>): number {
    return Math.round(p.tier1MileageDailyAmount);
  }

  static pricingFromVehicle(vehicle: Vehicle): VehiclePricingSnapshot {
    return {
      tier1MileageDailyAmount: vehicle.tier1MileageDailyAmount,
      tier2MileageDailyAmount: vehicle.tier2MileageDailyAmount,
      tier3MileageDailyAmount: vehicle.tier3MileageDailyAmount,
      overagePricePerKm: vehicle.overagePricePerKm,
      insuranceAmount: vehicle.insuranceAmount,
      insuranceDiscountPercent: vehicle.insuranceDiscountPercent,
    };
  }

  /**
   * `overrides` permet de forcer partnerId/status côté serveur (ex: soumission par un
   * partenaire loueur -> status PENDING) sans dépendre de ce que le client envoie dans le DTO.
   */
  async create(createVehicleDto: CreateVehicleDto, overrides?: { partnerId?: string; status?: ListingStatus }) {
    if (!overrides?.partnerId) await this.moderation.assertOwnerPartner(createVehicleDto.partnerId, 'vehicle');
    return this.prisma.vehicle.create({
      data: { ...createVehicleDto, ...overrides },
    });
  }

  /** Grilles-modèles par type (préremplissage admin uniquement — plus utilisées pour facturer). */
  async findAllTypePricing(): Promise<VehicleTypePricing[]> {
    return this.prisma.vehicleTypePricing.findMany({ orderBy: { vehicleType: 'asc' } });
  }

  async findTypePricing(vehicleType: string): Promise<VehicleTypePricing | null> {
    return this.prisma.vehicleTypePricing.findUnique({
      where: { vehicleType },
    });
  }

  async upsertVehicleTypePricing(
    vehicleType: string,
    dto: UpsertVehicleTypePricingDto,
  ): Promise<VehicleTypePricing> {
    return this.prisma.vehicleTypePricing.upsert({
      where: { vehicleType },
      create: { vehicleType, ...dto },
      update: { ...dto },
    });
  }

  /** Supprime la grille-modèle d’un type si aucun véhicule ne référence ce `Vehicle.type`. */
  async deleteTypePricing(vehicleType: string): Promise<{ deleted: true }> {
    const count = await this.prisma.vehicle.count({ where: { type: vehicleType } });
    if (count > 0) {
      throw new ConflictException(
        `Impossible de supprimer le type « ${vehicleType} » : ${count} véhicule(s) l’utilisent encore.`,
      );
    }
    try {
      await this.prisma.vehicleTypePricing.delete({ where: { vehicleType } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException(`Aucune grille tarifaire pour le type « ${vehicleType} ».`);
      }
      throw e;
    }
    return { deleted: true };
  }

  private enrichVehicle(vehicle: Vehicle): VehicleWithPricing {
    const typePricing = VehiclesService.pricingFromVehicle(vehicle);
    return {
      ...vehicle,
      typePricing,
      fromPriceTier1: VehiclesService.tier1DailyCost(typePricing),
    };
  }

  private enrichMany(vehicles: Vehicle[]): VehicleWithPricing[] {
    return vehicles.map((v) => this.enrichVehicle(v));
  }

  async findAll(query: QueryVehiclesDto) {
    const {
      type,
      location,
      transmission,
      minPrice,
      maxPrice,
      search,
      startDate,
      endDate,
      guests,
      page = 1,
      limit = 10,
      includeUnavailable,
      includeAllStatuses,
    } = query;

    const where: Prisma.VehicleWhereInput = {};
    if (!includeUnavailable) {
      where.isAvailable = true;
    }

    // Vue publique : seuls les véhicules validés (APPROVED) sont visibles.
    // Un partenaire loueur soumet un véhicule en PENDING, invisible tant qu'un admin ne l'a pas validé.
    if (!includeAllStatuses) {
      where.status = 'APPROVED';
    } else if (query.status) {
      where.status = query.status;
    }

    if (location) {
      where.location = {
        contains: location,
        mode: Prisma.QueryMode.insensitive,
      };
    }

    if (transmission && transmission.trim() !== '') {
      where.transmission = {
        equals: transmission.trim(),
        mode: Prisma.QueryMode.insensitive,
      };
    }

    if (typeof guests === 'number' && guests >= 1) {
      where.seats = { gte: guests };
    }

    // Filtre de disponibilité : on exclut les véhicules dont un Booking PENDING/CONFIRMED
    // chevauche la période demandée (intervalles ouverts à droite).
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end) {
        where.bookings = {
          none: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            AND: [
              { startDate: { lt: end } },
              { endDate: { gt: start } },
            ],
          },
        };
      }
    }

    if (type) {
      where.type = type;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.tier1MileageDailyAmount = {};
      if (minPrice !== undefined) where.tier1MileageDailyAmount.gte = minPrice;
      if (maxPrice !== undefined) where.tier1MileageDailyAmount.lte = maxPrice;
    }

    if (search) {
      const searchConditions: Prisma.VehicleWhereInput[] = [
        { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { make: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { model: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
      where.OR = searchConditions;
    }

    const skip = (page - 1) * limit;

    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        // Back-office : l'admin doit savoir quel partenaire a proposé le bien pour le modérer.
        ...(includeAllStatuses && {
          include: { partner: { select: { id: true, legalName: true, fullName: true, email: true } } },
        }),
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    const data = this.enrichMany(vehicles);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findOne(id: string): Promise<VehicleWithPricing> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
          },
          select: {
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Véhicule avec l'ID ${id} non trouvé`);
    }

    const { bookings, ...rest } = vehicle;
    const enriched = this.enrichVehicle(rest as Vehicle);
    return { ...enriched, bookings } as VehicleWithPricing & { bookings: typeof bookings };
  }

  async checkAvailability(id: string, startDate: string, endDate: string) {
    const vehicle = await this.findOne(id);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return {
        available: false,
        reason: 'La date de fin doit être après la date de début',
        bookedDates: [],
      };
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        vehicleId: id,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    const bookedDates: string[] = [];
    bookings.forEach((booking) => {
      const bookingStart = new Date(booking.startDate);
      const bookingEnd = new Date(booking.endDate);
      const current = new Date(Math.max(bookingStart.getTime(), start.getTime()));
      const lastDate = new Date(Math.min(bookingEnd.getTime(), end.getTime()));

      while (current <= lastDate) {
        bookedDates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    });

    const hasConflict = bookings.length > 0;
    // Un bien non validé (PENDING/REJECTED) n'est jamais réservable, même via un lien direct.
    const available = !hasConflict && vehicle.isAvailable && vehicle.status === 'APPROVED';

    return {
      available,
      vehicleId: id,
      startDate,
      endDate,
      bookedDates,
    };
  }

  /** Mise à jour admin : contrôle du propriétaire, motif obligatoire au refus, notification du partenaire. */
  async update(id: string, updateVehicleDto: UpdateVehicleDto) {
    const previous = await this.prisma.vehicle.findUnique({ where: { id }, select: { status: true } });
    if (!previous) throw new NotFoundException(`Véhicule avec l'ID ${id} non trouvé`);
    if (updateVehicleDto.partnerId !== undefined) {
      await this.moderation.assertOwnerPartner(updateVehicleDto.partnerId, 'vehicle');
    }
    this.moderation.normalizeStatusChange(updateVehicleDto);

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: updateVehicleDto,
    });
    await this.moderation.notifyPartnerDecision('vehicle', updated, previous.status);
    return updated;
  }

  /** Fiche publique : un bien non validé n'existe pas pour les visiteurs. */
  async findPublicOne(id: string) {
    const vehicle = await this.findOne(id);
    if (vehicle.status !== 'APPROVED') {
      throw new NotFoundException(`Véhicule avec l'ID ${id} non trouvé`);
    }
    return vehicle;
  }

  remove(id: string) {
    return this.prisma.vehicle.delete({
      where: { id },
    });
  }
}
