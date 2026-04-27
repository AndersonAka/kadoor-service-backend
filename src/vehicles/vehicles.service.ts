import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { UpsertVehicleTypePricingDto } from './dto/upsert-vehicle-type-pricing.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Vehicle, VehicleTypePricing } from '@prisma/client';

export type VehicleWithPricing = Vehicle & {
  typePricing: VehicleTypePricing | null;
  fromPriceTier1: number;
};

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  /** Montant journalier du forfait « moins de 100 km/j », affichage « à partir de » (forfait km) */
  static tier1DailyCost(p: Pick<VehicleTypePricing, 'tier1MileageDailyAmount'>): number {
    return Math.round(p.tier1MileageDailyAmount);
  }

  create(createVehicleDto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: createVehicleDto,
    });
  }

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

  /** Supprime la grille d’un type si aucun véhicule ne référence ce `Vehicle.type`. */
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

  private async loadPricingForTypes(types: string[]): Promise<Map<string, VehicleTypePricing>> {
    const unique = [...new Set(types.filter(Boolean))];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.vehicleTypePricing.findMany({
      where: { vehicleType: { in: unique } },
    });
    return new Map(rows.map((r) => [r.vehicleType, r]));
  }

  private enrichVehicle(vehicle: Vehicle, pricingMap: Map<string, VehicleTypePricing>): VehicleWithPricing {
    const typePricing = pricingMap.get(vehicle.type) ?? null;
    const fromPriceTier1 = typePricing ? VehiclesService.tier1DailyCost(typePricing) : 0;
    return {
      ...vehicle,
      typePricing,
      fromPriceTier1,
    };
  }

  private async enrichMany(vehicles: Vehicle[]): Promise<VehicleWithPricing[]> {
    const map = await this.loadPricingForTypes(vehicles.map((v) => v.type));
    return vehicles.map((v) => this.enrichVehicle(v, map));
  }

  async findAll(query: QueryVehiclesDto) {
    const {
      type,
      location,
      minPrice,
      maxPrice,
      search,
      page = 1,
      limit = 10,
      includeUnavailable,
    } = query;

    const where: Prisma.VehicleWhereInput = {};
    if (!includeUnavailable) {
      where.isAvailable = true;
    }

    if (location) {
      where.location = {
        contains: location,
        mode: Prisma.QueryMode.insensitive,
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const pricings = await this.prisma.vehicleTypePricing.findMany();
      let matchingTypes = pricings
        .filter((p) => {
          const t1 = VehiclesService.tier1DailyCost(p);
          if (minPrice !== undefined && t1 < minPrice) return false;
          if (maxPrice !== undefined && t1 > maxPrice) return false;
          return true;
        })
        .map((p) => p.vehicleType);

      if (type) {
        matchingTypes = matchingTypes.filter((t) => t === type);
      }

      if (matchingTypes.length === 0) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }

      where.type = type ? type : { in: matchingTypes };
    } else if (type) {
      where.type = type;
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
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    const data = await this.enrichMany(vehicles);

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
    const map = await this.loadPricingForTypes([rest.type]);
    const enriched = this.enrichVehicle(rest as Vehicle, map);
    return { ...enriched, bookings };
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
    const available = !hasConflict && vehicle.isAvailable;

    return {
      available,
      vehicleId: id,
      startDate,
      endDate,
      bookedDates,
    };
  }

  update(id: string, updateVehicleDto: UpdateVehicleDto) {
    return this.prisma.vehicle.update({
      where: { id },
      data: updateVehicleDto,
    });
  }

  remove(id: string) {
    return this.prisma.vehicle.delete({
      where: { id },
    });
  }
}
