import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

// ReviewsService est le service qui gère les reviews (commentaires) des véhicules et des appartements
// Il permet de créer, de lire, de mettre à jour et de supprimer les reviews
// Il permet également de calculer la moyenne des notes des véhicules et des appartements
// Il permet également de calculer le nombre de reviews des véhicules et des appartements
// Il permet également de calculer le nombre de reviews des véhicules et des appartements

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(createReviewDto: CreateReviewDto) {
    // Vérifier que le véhicule ou l'appartement existe
    if (createReviewDto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: createReviewDto.vehicleId },
      });
      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }
    }

    if (createReviewDto.apartmentId) {
      const apartment = await this.prisma.apartment.findUnique({
        where: { id: createReviewDto.apartmentId },
      });
      if (!apartment) {
        throw new NotFoundException('Apartment not found');
      }
    }

    return this.prisma.review.create({
      data: createReviewDto,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findByVehicle(vehicleId: string) {
    return this.prisma.review.findMany({
      where: { vehicleId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByApartment(apartmentId: string) {
    return this.prisma.review.findMany({
      where: { apartmentId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAverageRating(vehicleId?: string, apartmentId?: string) {
    const where: any = {};
    if (vehicleId) where.vehicleId = vehicleId;
    if (apartmentId) where.apartmentId = apartmentId;

    const reviews = await this.prisma.review.findMany({ where });
    if (reviews.length === 0) return { average: 0, count: 0 };

    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return {
      average: Math.round((sum / reviews.length) * 10) / 10,
      count: reviews.length,
    };
  }
}
