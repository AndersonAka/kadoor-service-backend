import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private inAppNotifications: InAppNotificationsService,
  ) {}

  async create(createReviewDto: CreateReviewDto) {
    let itemTitle = 'Service';

    if (createReviewDto.vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: createReviewDto.vehicleId },
        select: { id: true, title: true },
      });
      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }
      itemTitle = vehicle.title;
    }

    if (createReviewDto.apartmentId) {
      const apartment = await this.prisma.apartment.findUnique({
        where: { id: createReviewDto.apartmentId },
        select: { id: true, title: true },
      });
      if (!apartment) {
        throw new NotFoundException('Apartment not found');
      }
      itemTitle = apartment.title;
    }

    const review = await this.prisma.review.create({
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

    this.inAppNotifications
      .notifyNewReview(itemTitle, review.rating)
      .catch((err) => console.error('[ReviewsService] In-app new review notif error:', err));

    return review;
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
