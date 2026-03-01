import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async addFavorite(userId: string, vehicleId?: string, apartmentId?: string) {
    if (!vehicleId && !apartmentId) {
      throw new BadRequestException('vehicleId ou apartmentId requis');
    }

    if (vehicleId && apartmentId) {
      throw new BadRequestException('Un seul type de favori à la fois');
    }

    // Check if already favorited
    const existing = await this.prisma.favorite.findFirst({
      where: {
        userId,
        ...(vehicleId ? { vehicleId } : { apartmentId }),
      },
    });

    if (existing) {
      return existing;
    }

    // Verify item exists
    if (vehicleId) {
      const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) throw new NotFoundException('Véhicule non trouvé');
    }

    if (apartmentId) {
      const apartment = await this.prisma.apartment.findUnique({ where: { id: apartmentId } });
      if (!apartment) throw new NotFoundException('Appartement non trouvé');
    }

    return this.prisma.favorite.create({
      data: {
        userId,
        vehicleId,
        apartmentId,
      },
      include: {
        vehicle: true,
        apartment: true,
      },
    });
  }

  async removeFavorite(userId: string, vehicleId?: string, apartmentId?: string) {
    if (!vehicleId && !apartmentId) {
      throw new BadRequestException('vehicleId ou apartmentId requis');
    }

    const favorite = await this.prisma.favorite.findFirst({
      where: {
        userId,
        ...(vehicleId ? { vehicleId } : { apartmentId }),
      },
    });

    if (!favorite) {
      throw new NotFoundException('Favori non trouvé');
    }

    return this.prisma.favorite.delete({
      where: { id: favorite.id },
    });
  }

  async getUserFavorites(userId: string, type?: 'vehicle' | 'apartment') {
    const where: any = { userId };

    if (type === 'vehicle') {
      where.vehicleId = { not: null };
    } else if (type === 'apartment') {
      where.apartmentId = { not: null };
    }

    return this.prisma.favorite.findMany({
      where,
      include: {
        vehicle: true,
        apartment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async isFavorite(userId: string, vehicleId?: string, apartmentId?: string): Promise<boolean> {
    if (!vehicleId && !apartmentId) {
      return false;
    }

    const favorite = await this.prisma.favorite.findFirst({
      where: {
        userId,
        ...(vehicleId ? { vehicleId } : { apartmentId }),
      },
    });

    return !!favorite;
  }

  async toggleFavorite(userId: string, vehicleId?: string, apartmentId?: string) {
    const isFav = await this.isFavorite(userId, vehicleId, apartmentId);

    if (isFav) {
      await this.removeFavorite(userId, vehicleId, apartmentId);
      return { isFavorite: false };
    } else {
      await this.addFavorite(userId, vehicleId, apartmentId);
      return { isFavorite: true };
    }
  }
}
