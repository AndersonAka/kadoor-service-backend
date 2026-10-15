import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ApartmentsService } from '../apartments/apartments.service';

export type CrossSellSourceType = 'vehicle' | 'apartment';

@Injectable()
export class RecommendationsService {
  constructor(
    private prisma: PrismaService,
    private vehiclesService: VehiclesService,
    private apartmentsService: ApartmentsService,
  ) {}

  async getCrossSell(params: {
    sourceType: CrossSellSourceType;
    sourceId: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const limit = Math.min(Math.max(params.limit ?? 6, 1), 12);
    const { sourceType, sourceId, startDate, endDate } = params;

    if (sourceType === 'vehicle') {
      return this.recommendApartments(sourceId, startDate, endDate, limit);
    }
    if (sourceType === 'apartment') {
      return this.recommendVehicles(sourceId, startDate, endDate, limit);
    }
    throw new BadRequestException('sourceType invalide (vehicle|apartment)');
  }

  private nightsBetween(startDate?: string, endDate?: string): number {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const ms = end.getTime() - start.getTime();
    if (Number.isNaN(ms) || ms <= 0) return 1;
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }

  private async recommendApartments(
    vehicleId: string,
    startDate: string | undefined,
    endDate: string | undefined,
    limit: number,
  ) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Véhicule source introuvable');

    const pricing = await this.vehiclesService.findTypePricing(vehicle.type);
    const daily = pricing ? VehiclesService.tier1DailyCost(pricing) : 0;
    const nights = this.nightsBetween(startDate, endDate);
    const budget = daily * nights;
    const cityHint = (vehicle.location || 'Abidjan').split(',')[0].trim();

    const candidates = await this.prisma.apartment.findMany({
      where: {
        status: 'APPROVED',
        isAvailable: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    const scored = candidates
      .map((a) => {
        const stayCost = (a.pricePerNight || 0) * nights + (a.cleaningFee || 0);
        let score = 0;
        if (cityHint && a.city?.toLowerCase().includes(cityHint.toLowerCase())) score += 40;
        else if (a.city?.toLowerCase().includes('abidjan')) score += 15;
        if (budget > 0) {
          const ratio = stayCost / budget;
          if (ratio >= 0.6 && ratio <= 1.4) score += 35;
          else if (ratio >= 0.4 && ratio <= 1.8) score += 15;
        }
        if (vehicle.seats && a.bedrooms >= Math.ceil(vehicle.seats / 2)) score += 10;
        score += Math.min(10, a.images?.length || 0);
        return { apartment: a, score, stayCost };
      })
      .sort((a, b) => b.score - a.score);

    const available: typeof scored = [];
    for (const row of scored) {
      if (available.length >= limit) break;
      if (startDate && endDate) {
        try {
          const check = await this.apartmentsService.checkAvailability(
            row.apartment.id,
            startDate,
            endDate,
          );
          if (!check.available) continue;
        } catch {
          continue;
        }
      }
      available.push(row);
    }

    // Fallback sans filtre dispo si trop peu de résultats
    const pool = available.length > 0 ? available : scored.slice(0, limit);

    return {
      sourceType: 'vehicle' as const,
      sourceId: vehicleId,
      targetType: 'apartment' as const,
      items: pool.slice(0, limit).map(({ apartment, stayCost }) => ({
        id: apartment.id,
        title: apartment.title,
        type: apartment.type,
        city: apartment.city,
        images: apartment.images?.slice(0, 3) || [],
        price: apartment.pricePerNight,
        priceLabel: 'per_night',
        estimatedStay: stayCost,
        href: `/apartment-details/${apartment.id}`,
        availableOnDates: Boolean(startDate && endDate),
      })),
    };
  }

  private async recommendVehicles(
    apartmentId: string,
    startDate: string | undefined,
    endDate: string | undefined,
    limit: number,
  ) {
    const apartment = await this.prisma.apartment.findUnique({ where: { id: apartmentId } });
    if (!apartment) throw new NotFoundException('Appartement source introuvable');

    const nights = this.nightsBetween(startDate, endDate);
    const budget = (apartment.pricePerNight || 0) * nights + (apartment.cleaningFee || 0);
    const cityHint = (apartment.city || 'Abidjan').trim();

    const candidates = await this.prisma.vehicle.findMany({
      where: {
        status: 'APPROVED',
        isAvailable: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    const allPricing = await this.vehiclesService.findAllTypePricing();
    const pricingMap = new Map(allPricing.map((p) => [p.vehicleType, p]));
    const enriched = candidates.map((v) => {
      const pricing = pricingMap.get(v.type);
      const daily = pricing ? VehiclesService.tier1DailyCost(pricing) : 0;
      return { vehicle: v, daily, stayCost: daily * nights };
    });

    const scored = enriched
      .map(({ vehicle, daily, stayCost }) => {
        let score = 0;
        if (cityHint && vehicle.location?.toLowerCase().includes(cityHint.toLowerCase())) score += 40;
        else if (vehicle.location?.toLowerCase().includes('abidjan')) score += 15;
        if (budget > 0 && stayCost > 0) {
          const ratio = stayCost / budget;
          if (ratio >= 0.6 && ratio <= 1.4) score += 35;
          else if (ratio >= 0.4 && ratio <= 1.8) score += 15;
        }
        if (apartment.bedrooms && vehicle.seats && vehicle.seats >= apartment.bedrooms) score += 10;
        score += Math.min(10, vehicle.images?.length || 0);
        return { vehicle, score, daily, stayCost };
      })
      .sort((a, b) => b.score - a.score);

    const available: typeof scored = [];
    for (const row of scored) {
      if (available.length >= limit) break;
      if (startDate && endDate) {
        try {
          const check = await this.vehiclesService.checkAvailability(
            row.vehicle.id,
            startDate,
            endDate,
          );
          if (!check.available) continue;
        } catch {
          continue;
        }
      }
      available.push(row);
    }

    const pool = available.length > 0 ? available : scored.slice(0, limit);

    return {
      sourceType: 'apartment' as const,
      sourceId: apartmentId,
      targetType: 'vehicle' as const,
      items: pool.slice(0, limit).map(({ vehicle, daily, stayCost }) => ({
        id: vehicle.id,
        title: vehicle.title,
        type: vehicle.type,
        city: vehicle.location,
        images: vehicle.images?.slice(0, 3) || [],
        price: daily,
        priceLabel: 'per_day',
        fromPriceTier1: daily,
        estimatedStay: stayCost,
        href: `/vehicle-details/${vehicle.id}`,
        availableOnDates: Boolean(startDate && endDate),
      })),
    };
  }
}
