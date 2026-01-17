import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { QueryApartmentsDto } from './dto/query-apartments.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ApartmentsService {
  constructor(private prisma: PrismaService) {}

  create(createApartmentDto: CreateApartmentDto) {
    return this.prisma.apartment.create({
      data: createApartmentDto,
    });
  }

  async findAll(query: QueryApartmentsDto) {
    const {
      type,
      city,
      minPrice,
      maxPrice,
      bedrooms,
      search,
      page = 1,
      limit = 10,
    } = query;

    const where: Prisma.ApartmentWhereInput = {
      isAvailable: true,
    };

    // Filtre par type
    if (type) {
      where.type = type;
    }

    // Filtre par ville
    if (city) {
      where.city = {
        contains: city,
        mode: 'insensitive',
      };
    }

    // Filtre par prix
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.pricePerNight = {};
      if (minPrice !== undefined) {
        where.pricePerNight.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.pricePerNight.lte = maxPrice;
      }
    }

    // Filtre par nombre de chambres
    if (bedrooms !== undefined) {
      where.bedrooms = bedrooms;
    }

    // Recherche textuelle
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [apartments, total] = await Promise.all([
      this.prisma.apartment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.apartment.count({ where }),
    ]);

    return {
      data: apartments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const apartment = await this.prisma.apartment.findUnique({
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

    if (!apartment) {
      throw new NotFoundException(`Appartement avec l'ID ${id} non trouvé`);
    }

    return apartment;
  }

  async checkAvailability(id: string, startDate: string, endDate: string) {
    const apartment = await this.findOne(id);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return {
        available: false,
        reason: 'La date de fin doit être après la date de début',
      };
    }

    // Vérifier les réservations existantes
    const conflictingBookings = await this.prisma.booking.findFirst({
      where: {
        apartmentId: id,
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
        OR: [
          {
            startDate: {
              gte: start,
              lte: end,
            },
          },
          {
            endDate: {
              gte: start,
              lte: end,
            },
          },
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: end } },
            ],
          },
        ],
      },
    });

    const available = !conflictingBookings && apartment.isAvailable;

    return {
      available,
      apartmentId: id,
      startDate,
      endDate,
      conflictingBooking: conflictingBookings || null,
    };
  }

  update(id: string, updateApartmentDto: UpdateApartmentDto) {
    return this.prisma.apartment.update({
      where: { id },
      data: updateApartmentDto,
    });
  }

  remove(id: string) {
    return this.prisma.apartment.delete({
      where: { id },
    });
  }
}
