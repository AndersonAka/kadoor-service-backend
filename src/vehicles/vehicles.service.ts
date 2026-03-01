import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  create(createVehicleDto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: createVehicleDto,
    });
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
    } = query;

    const where: Prisma.VehicleWhereInput = {
      isAvailable: true,
    };

    // Filtre par type
    if (type) {
      where.type = type;
    }

    // Filtre par localisation
    if (location) {
      (where as any).location = {
        contains: location,
        mode: Prisma.QueryMode.insensitive,
      };
    }

    // Filtre par prix
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.pricePerDay = {};
      if (minPrice !== undefined) {
        where.pricePerDay.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.pricePerDay.lte = maxPrice;
      }
    }

    // Recherche textuelle
    if (search) {
      const searchConditions: any[] = [
        { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
      
      // Ajouter make et model (champs optionnels dans le schéma)
      searchConditions.push(
        { make: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { model: { contains: search, mode: Prisma.QueryMode.insensitive } },
      );
      
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

    return {
      data: vehicles,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
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

    return vehicle;
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

    // Récupérer toutes les réservations pour la période
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

    // Générer la liste des dates réservées
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

    // Vérifier s'il y a des conflits
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
