import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationVehicleDto } from './dto/create-reservation-vehicle.dto';
import { CreateReservationApartmentDto } from './dto/create-reservation-apartment.dto';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ApartmentsService } from '../apartments/apartments.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaystackService } from './paystack.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private vehiclesService: VehiclesService,
    private apartmentsService: ApartmentsService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private paystackService: PaystackService,
    private configService: ConfigService,
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

    const booking = await this.prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        vehicle: true,
        apartment: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    if (status === 'CANCELLED' && booking.user?.email) {
      this.emailService
        .sendCancellationEmail(booking, booking.user.email)
        .catch((err) => console.error('[ReservationsService] Cancellation email error:', err));
    }

    return booking;
  }

  /**
   * Annule une réservation
   */
  async cancel(id: string) {
    return this.updateStatus(id, 'CANCELLED');
  }

  // ─── Paystack Payment Methods ──────────────────────────────────────────

  private buildCallbackUrl(bookingId: string): string {
    const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
    const defaultLocale = this.configService.get<string>('WEB_APP_DEFAULT_LOCALE') || 'fr';
    return `${webAppUrl}/${defaultLocale}/payment/callback?bookingId=${bookingId}`;
  }

  /**
   * Crée une réservation de véhicule PENDING puis initie le paiement Paystack.
   * Retourne { booking, paymentUrl }
   */
  async initiateVehiclePayment(
    userId: string,
    userEmail: string,
    dto: CreateReservationVehicleDto,
  ) {
    const { vehicleId, startDate, endDate } = dto;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) throw new BadRequestException('La date de fin doit être après la date de début');
    if (start < new Date()) throw new BadRequestException('La date de début ne peut pas être dans le passé');

    const availability = await this.vehiclesService.checkAvailability(vehicleId, startDate, endDate);
    if (!availability.available) {
      throw new ConflictException(`Le véhicule n'est pas disponible. ${availability.reason || ''}`);
    }

    const vehicle = await this.vehiclesService.findOne(vehicleId);
    if (!vehicle) throw new NotFoundException('Véhicule non trouvé');

    const days = this.calculateDays(start, end);
    const totalPrice = vehicle.pricePerDay * days;
    const paystackReference = uuidv4();

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        vehicleId,
        startDate: start,
        endDate: end,
        totalPrice,
        status: 'PENDING',
        paystackReference,
      },
      include: {
        vehicle: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });

    const callbackUrl = this.buildCallbackUrl(booking.id);
    const result = await this.paystackService.initializeTransaction({
      email: userEmail,
      amount: totalPrice,
      reference: paystackReference,
      callback_url: callbackUrl,
      metadata: { bookingId: booking.id, type: 'vehicle', vehicleId },
    });

    return { booking, paymentUrl: result.authorization_url };
  }

  /**
   * Crée une réservation d'appartement PENDING puis initie le paiement Paystack.
   * Retourne { booking, paymentUrl }
   */
  async initiateApartmentPayment(
    userId: string,
    userEmail: string,
    dto: CreateReservationApartmentDto,
  ) {
    const { apartmentId, startDate, endDate } = dto;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) throw new BadRequestException('La date de fin doit être après la date de début');
    if (start < new Date()) throw new BadRequestException('La date de début ne peut pas être dans le passé');

    const availability = await this.apartmentsService.checkAvailability(apartmentId, startDate, endDate);
    if (!availability.available) {
      throw new ConflictException(`L'appartement n'est pas disponible. ${availability.reason || ''}`);
    }

    const apartment = await this.apartmentsService.findOne(apartmentId);
    if (!apartment) throw new NotFoundException('Appartement non trouvé');

    const days = this.calculateDays(start, end);
    const totalPrice = apartment.pricePerNight * days;
    const paystackReference = uuidv4();

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        apartmentId,
        startDate: start,
        endDate: end,
        totalPrice,
        status: 'PENDING',
        paystackReference,
      },
      include: {
        apartment: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });

    const callbackUrl = this.buildCallbackUrl(booking.id);
    const result = await this.paystackService.initializeTransaction({
      email: userEmail,
      amount: totalPrice,
      reference: paystackReference,
      callback_url: callbackUrl,
      metadata: { bookingId: booking.id, type: 'apartment', apartmentId },
    });

    return { booking, paymentUrl: result.authorization_url };
  }

  /**
   * Vérifie le paiement Paystack par référence et confirme la réservation.
   */
  async verifyPayment(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Réservation non trouvée');

    if (booking.status === 'CONFIRMED') {
      return { booking, status: 'success', message: 'Paiement déjà confirmé' };
    }

    if (!booking.paystackReference) {
      throw new BadRequestException('Aucune référence de paiement associée');
    }

    const verification = await this.paystackService.verifyTransaction(booking.paystackReference);

    if (verification.status === 'success') {
      const confirmed = await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
        include: {
          vehicle: true,
          apartment: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        },
      });

      this.emailService.sendReservationConfirmation(confirmed, confirmed.user.email).catch(
        (err) => console.error('Erreur email confirmation:', err),
      );

      this.notificationsService
        .sendReservationConfirmation(confirmed.userId, bookingId, confirmed.vehicle ? 'vehicle' : 'apartment')
        .catch((err) => console.error('[verifyPayment] Push notification error:', err));

      return { booking: confirmed, status: 'success', paystackStatus: verification.status };
    }

    if (verification.status === 'failed' || verification.status === 'abandoned') {
      await this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } });
      return { booking, status: 'failed', paystackStatus: verification.status };
    }

    return { booking, status: 'pending', paystackStatus: verification.status };
  }

  /**
   * Traite le webhook Paystack (charge.success / charge.failed)
   */
  async handleWebhook(signature: string, rawBody: string, body: any) {
    const isValid = this.paystackService.validateWebhookSignature(signature, rawBody);
    if (!isValid) return { status: 'error', message: 'Invalid signature' };

    if (body.event === 'charge.success' || body.event === 'charge.failed') {
      const reference = body.data?.reference;
      if (!reference) return { status: 'error', message: 'No reference' };

      const existing = await this.prisma.booking.findFirst({ where: { paystackReference: reference } });
      if (!existing) return { status: 'ok', message: 'Booking not found' };

      if (existing.status === 'CONFIRMED' || existing.status === 'CANCELLED') {
        return { status: 'ok', message: 'Already processed' };
      }

      if (body.event === 'charge.success') {
        const confirmed = await this.prisma.booking.update({
          where: { id: existing.id },
          data: { status: 'CONFIRMED' },
          include: {
            vehicle: true,
            apartment: true,
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        });
        if (confirmed.user?.email) {
          this.emailService
            .sendPaymentConfirmation(confirmed, confirmed.user.email)
            .catch((err) => console.error('[Webhook] Payment confirmation email error:', err));
          this.notificationsService
            .sendReservationConfirmation(confirmed.userId, confirmed.id, confirmed.vehicle ? 'vehicle' : 'apartment')
            .catch((err) => console.error('[Webhook] Push notification error:', err));
        }
      } else {
        const cancelled = await this.prisma.booking.update({
          where: { id: existing.id },
          data: { status: 'CANCELLED' },
          include: {
            vehicle: true,
            apartment: true,
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        });
        if (cancelled.user?.email) {
          this.emailService
            .sendCancellationEmail(cancelled, cancelled.user.email)
            .catch((err) => console.error('[Webhook] Cancellation email error:', err));
        }
      }
    }

    return { status: 'ok' };
  }
}
