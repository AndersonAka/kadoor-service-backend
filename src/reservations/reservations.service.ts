import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationVehicleDto } from './dto/create-reservation-vehicle.dto';
import { CreateReservationApartmentDto } from './dto/create-reservation-apartment.dto';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ApartmentsService } from '../apartments/apartments.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private vehiclesService: VehiclesService,
    private apartmentsService: ApartmentsService,
    private emailService: EmailService,
  ) {}

  /**
   * Calcule le nombre de jours entre deux dates
   */
  private calculateDays(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1; // Minimum 1 jour
  }

  /**
   * Crée une réservation de véhicule
   */
  async createVehicleReservation(userId: string, dto: CreateReservationVehicleDto) {
    const { vehicleId, startDate, endDate } = dto;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validation des dates
    if (start >= end) {
      throw new BadRequestException('La date de fin doit être après la date de début');
    }

    if (start < new Date()) {
      throw new BadRequestException('La date de début ne peut pas être dans le passé');
    }

    // Vérifier la disponibilité
    const availability = await this.vehiclesService.checkAvailability(
      vehicleId,
      startDate,
      endDate,
    );

    if (!availability.available) {
      throw new ConflictException(
        `Le véhicule n'est pas disponible pour cette période. ${availability.reason || ''}`,
      );
    }

    // Récupérer le véhicule pour calculer le prix
    const vehicle = await this.vehiclesService.findOne(vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Véhicule non trouvé');
    }

    // Calculer le prix total
    const days = this.calculateDays(start, end);
    const basePrice = vehicle.pricePerDay * days;
    // TODO: Ajouter les suppléments (conducteur additionnel, etc.)
    const totalPrice = basePrice;

    // Créer la réservation
    const reservation = await this.prisma.booking.create({
      data: {
        userId,
        vehicleId,
        startDate: start,
        endDate: end,
        totalPrice,
        status: 'PENDING',
      },
      include: {
        vehicle: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Envoyer l'email de confirmation (asynchrone, ne bloque pas la réponse)
    this.emailService.sendReservationConfirmation(reservation, reservation.user.email).catch(
      (error) => console.error('Erreur envoi email confirmation:', error),
    );

    return reservation;
  }

  /**
   * Crée une réservation d'appartement
   */
  async createApartmentReservation(userId: string, dto: CreateReservationApartmentDto) {
    const { apartmentId, startDate, endDate } = dto;

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validation des dates
    if (start >= end) {
      throw new BadRequestException('La date de fin doit être après la date de début');
    }

    if (start < new Date()) {
      throw new BadRequestException('La date de début ne peut pas être dans le passé');
    }

    // Vérifier la disponibilité
    const availability = await this.apartmentsService.checkAvailability(
      apartmentId,
      startDate,
      endDate,
    );

    if (!availability.available) {
      throw new ConflictException(
        `L'appartement n'est pas disponible pour cette période. ${availability.reason || ''}`,
      );
    }

    // Récupérer l'appartement pour calculer le prix
    const apartment = await this.apartmentsService.findOne(apartmentId);
    if (!apartment) {
      throw new NotFoundException('Appartement non trouvé');
    }

    // Calculer le prix total
    const days = this.calculateDays(start, end);
    const basePrice = apartment.pricePerNight * days;
    // TODO: Ajouter les suppléments (invités supplémentaires, etc.)
    const totalPrice = basePrice;

    // Créer la réservation
    const reservation = await this.prisma.booking.create({
      data: {
        userId,
        apartmentId,
        startDate: start,
        endDate: end,
        totalPrice,
        status: 'PENDING',
      },
      include: {
        apartment: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    // Envoyer l'email de confirmation (asynchrone, ne bloque pas la réponse)
    this.emailService.sendReservationConfirmation(reservation, reservation.user.email).catch(
      (error) => console.error('Erreur envoi email confirmation:', error),
    );

    return reservation;
  }

  /**
   * Récupère toutes les réservations (avec filtres)
   */
  async findAll(userId?: string, status?: string) {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.booking.findMany({
      where,
      include: {
        vehicle: true,
        apartment: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Récupère une réservation par ID
   */
  async findOne(id: string) {
    const reservation = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        vehicle: true,
        apartment: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException(`Réservation avec l'ID ${id} non trouvée`);
    }

    return reservation;
  }

  /**
   * Met à jour le statut d'une réservation
   */
  async updateStatus(id: string, status: string) {
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Statut invalide. Statuts valides: ${validStatuses.join(', ')}`);
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Annule une réservation
   */
  async cancel(id: string) {
    return this.updateStatus(id, 'CANCELLED');
  }
}
