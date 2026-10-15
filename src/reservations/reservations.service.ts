import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VehicleTypePricing } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationVehicleDto } from './dto/create-reservation-vehicle.dto';
import { CreateReservationApartmentDto } from './dto/create-reservation-apartment.dto';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ApartmentsService } from '../apartments/apartments.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GeniusPayService } from '../payments/providers/geniuspay/geniuspay.service';
import { SettingsService } from '../settings/settings.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { AuditService } from '../audit/audit.service';

/** Clés SiteSettings — forfaits kilométriques */
const MILEAGE_TIER1_KM_KEY   = 'mileage_tier1_limit';          // km/jour inclus (défaut 100)
const MILEAGE_TIER1_PRICE_KEY = 'mileage_tier1_price_per_km';  // FCFA/km (défaut 300)
const MILEAGE_TIER2_KM_KEY   = 'mileage_tier2_limit';          // km/jour inclus (défaut 200)
const MILEAGE_TIER2_PRICE_KEY = 'mileage_tier2_price_per_km';  // FCFA/km (défaut 270)
const MILEAGE_TIER3_KM_KEY   = 'mileage_tier3_limit';          // km/jour inclus (défaut 250)
const MILEAGE_TIER3_PRICE_KEY = 'mileage_tier3_price_per_km';  // FCFA/km (défaut 280)

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaService,
    private vehiclesService: VehiclesService,
    private apartmentsService: ApartmentsService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private geniusPayService: GeniusPayService,
    private configService: ConfigService,
    private settingsService: SettingsService,
    private promoCodesService: PromoCodesService,
    private audit: AuditService,
  ) {}

  /**
   * Calcule le nombre de jours entre deux dates
   */
  private async getVehicleTypePricing(vehicleType: string): Promise<VehicleTypePricing | null> {
    return this.prisma.vehicleTypePricing.findUnique({ where: { vehicleType } });
  }

  private requireVehicleTypePricing(vehicleType: string, row: VehicleTypePricing | null): VehicleTypePricing {
    if (!row) {
      throw new BadRequestException(
        `Grille tarifaire introuvable pour le type « ${vehicleType} ». Créez-la dans l’admin (tarifs par type).`,
      );
    }
    return row;
  }

  /** Enrichit le véhicule lié (affichage admin / détail réservation) */
  private async attachVehiclePricing<T extends { type: string }>(vehicle: T | null) {
    if (!vehicle) return null;
    const p = await this.prisma.vehicleTypePricing.findUnique({ where: { vehicleType: vehicle.type } });
    if (!p) {
      return { ...vehicle, typePricing: null, fromPriceTier1: null } as T & {
        typePricing: VehicleTypePricing | null;
        fromPriceTier1: number | null;
      };
    }
    return {
      ...vehicle,
      typePricing: p,
      fromPriceTier1: Math.round(p.tier1MileageDailyAmount),
    } as T & {
      typePricing: VehicleTypePricing;
      fromPriceTier1: number;
    };
  }

  /** Forfait km retenu pour le calcul (défaut : TIER1, moins de 150 km/j). */
  private resolveVehicleMileageTier(mileagePackage?: string | null): 'TIER1' | 'TIER2' | 'TIER3' {
    if (mileagePackage === 'TIER2' || mileagePackage === 'TIER3') return mileagePackage;
    return 'TIER1';
  }

  private calculateDays(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Nuits / jours de location : date de fin = jour de départ (exclu du séjour).
    // Ex. entrée 27/04, départ 03/05 → 6 nuits (27→28, …, 02→03).
    return Math.max(diffDays, 1);
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

    const typePricing = await this.getVehicleTypePricing(vehicle.type);
    const pricing = this.requireVehicleTypePricing(vehicle.type, typePricing);

    const days = this.calculateDays(start, end);
    const tier = this.resolveVehicleMileageTier(dto.mileagePackage);
    const mileagePackageCost = await this.computeMileageCost(tier, days, pricing);
    const totalPrice = mileagePackageCost;

    const reservation = await this.prisma.booking.create({
      data: {
        userId,
        vehicleId,
        startDate: start,
        endDate: end,
        pickupTime: dto.pickupTime || null,
        returnTime: dto.returnTime || null,
        totalPrice,
        status: 'PENDING',
        mileagePackage: tier,
        mileagePackageCost,
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

    // Note: L'email de confirmation sera envoyé après paiement confirmé

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

    // Note: L'email de confirmation sera envoyé après paiement confirmé

    return reservation;
  }

  /**
   * Récupère toutes les réservations (avec filtres et pagination)
   */
  async findAll(userId?: string, status?: string, page: number = 1, limit: number = 10) {
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    // Compter le total pour la pagination
    const total = await this.prisma.booking.count({ where });
    const totalPages = Math.ceil(total / limit) || 1;
    
    // Calculer le skip pour la pagination
    const skip = (page - 1) * limit;

    const data = await this.prisma.booking.findMany({
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
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
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

    if (reservation.vehicle) {
      reservation.vehicle = (await this.attachVehiclePricing(reservation.vehicle)) as typeof reservation.vehicle;
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

  // ─── GeniusPay Payment Methods ─────────────────────────────────────────

  /**
   * Lit un paramètre numérique dans SiteSettings.
   * Retourne `defaultValue` si la clé est absente ou invalide.
   */
  private async getNumericSetting(key: string, defaultValue: number): Promise<number> {
    const setting = await this.settingsService.findByKey(key);
    if (!setting) return defaultValue;
    const parsed = parseFloat(setting.value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Supplément assurance : montant fixe et % de réduction issus uniquement de VehicleTypePricing.
   * totalWithInsurance = basePrice − réduction + assurance
   */
  private computeInsurance(
    basePrice: number,
    typePricing: VehicleTypePricing,
  ): {
    insurancePrice: number;
    insuranceDiscount: number;
    totalWithInsurance: number;
  } {
    const insurancePrice = typePricing.insuranceAmount;
    const discountPercent = typePricing.insuranceDiscountPercent;
    const insuranceDiscount = Math.round(basePrice * (discountPercent / 100));
    const totalWithInsurance = basePrice - insuranceDiscount + insurancePrice;
    return { insurancePrice, insuranceDiscount, totalWithInsurance };
  }

  /**
   * Montant location sur la durée : tarif journalier du forfait km × nb de jours
   * (sans prix « base » séparé).
   */
  private async computeMileageCost(
    tier: 'TIER1' | 'TIER2' | 'TIER3',
    days: number,
    typePricing?: VehicleTypePricing | null,
  ): Promise<number> {
    if (typePricing) {
      if (tier === 'TIER1') {
        return Math.round(typePricing.tier1MileageDailyAmount * days);
      }
      if (tier === 'TIER2') {
        return Math.round(typePricing.tier2MileageDailyAmount * days);
      }
      return Math.round(typePricing.tier3MileageDailyAmount * days);
    }

    let kmKey: string, priceKey: string, defaultKm: number, defaultPrice: number;

    if (tier === 'TIER1') {
      kmKey = MILEAGE_TIER1_KM_KEY; priceKey = MILEAGE_TIER1_PRICE_KEY; defaultKm = 100; defaultPrice = 300;
    } else if (tier === 'TIER2') {
      kmKey = MILEAGE_TIER2_KM_KEY; priceKey = MILEAGE_TIER2_PRICE_KEY; defaultKm = 200; defaultPrice = 270;
    } else {
      kmKey = MILEAGE_TIER3_KM_KEY; priceKey = MILEAGE_TIER3_PRICE_KEY; defaultKm = 250; defaultPrice = 280;
    }

    const kmPerDay = await this.getNumericSetting(kmKey, defaultKm);
    const pricePerKm = await this.getNumericSetting(priceKey, defaultPrice);

    return Math.round(kmPerDay * pricePerKm * days);
  }

  /**
   * Applique éventuellement un code promo sur un montant.
   * Lance une exception si le code est invalide.
   */
  private async applyPromoCode(
    code: string | undefined,
    amount: number,
    itemType: 'VEHICLE' | 'APARTMENT',
  ): Promise<{ promoCode: string | null; promoCodeId: string | null; promoDiscount: number | null; finalAmount: number }> {
    if (!code || !code.trim()) {
      return { promoCode: null, promoCodeId: null, promoDiscount: null, finalAmount: amount };
    }

    const result = await this.promoCodesService.validate(code, amount, itemType);
    if (!result.valid || !result.promo) {
      throw new BadRequestException(result.reason || 'Code promo invalide');
    }

    return {
      promoCode: result.promo.code,
      promoCodeId: result.promo.id,
      promoDiscount: result.promo.discount,
      finalAmount: result.promo.finalAmount,
    };
  }

  private buildCallbackUrl(bookingId: string): string {
    const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
    const defaultLocale = this.configService.get<string>('WEB_APP_DEFAULT_LOCALE') || 'fr';
    return `${webAppUrl}/${defaultLocale}/payment/callback?bookingId=${bookingId}`;
  }

  /** Include utilisé pour les emails / réponses après confirmation de paiement */
  private getBookingConfirmationInclude() {
    return {
      vehicle: true,
      apartment: true,
      user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
    };
  }

  /**
   * Passe la réservation de PENDING à CONFIRMED de façon atomique.
   * Évite les doubles envois d'email lorsque verifyPayment et le webhook
   * (ou des retries) arrivent en concurrence.
   */
  private async tryTransitionBookingToConfirmed(
    bookingId: string,
    options?: { paymentReference?: string },
  ) {
    const where: { id: string; status: string; paymentReference?: string } = {
      id: bookingId,
      status: 'PENDING',
    };
    if (options?.paymentReference) {
      where.paymentReference = options.paymentReference;
    }

    const updateResult = await this.prisma.booking.updateMany({
      where,
      data: { status: 'CONFIRMED' },
    });

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: this.getBookingConfirmationInclude(),
    });

    return { transitioned: updateResult.count > 0, booking };
  }

  private async afterBookingConfirmed(confirmed: any, bookingId: string) {
    if (confirmed?.user?.email) {
      this.emailService.sendReservationConfirmation(confirmed, confirmed.user.email).catch(
        (err) => console.error('Erreur email confirmation réservation:', err),
      );
    }
    if (confirmed?.promoCodeId) {
      this.promoCodesService
        .incrementUsage(confirmed.promoCodeId)
        .catch((err) => console.error('[verifyPayment] Promo usage error:', err));
    }
    if (confirmed?.userId) {
      this.notificationsService
        .sendReservationConfirmation(confirmed.userId, bookingId, confirmed.vehicle ? 'vehicle' : 'apartment')
        .catch((err) => console.error('[verifyPayment] Push notification error:', err));
    }
  }

  /**
   * Crée une réservation de véhicule PENDING puis initie le paiement GeniusPay.
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

    const typePricingRow = await this.getVehicleTypePricing(vehicle.type);
    const typePricing = this.requireVehicleTypePricing(vehicle.type, typePricingRow);

    const days = this.calculateDays(start, end);

    const tier = this.resolveVehicleMileageTier(dto.mileagePackage);
    const mileagePackageCost = await this.computeMileageCost(tier, days, typePricing);
    const priceWithMileage = mileagePackageCost;

    let totalPrice = priceWithMileage;
    let insurancePrice: number | null = null;
    let insuranceDiscount: number | null = null;

    if (dto.hasInsurance) {
      const insurance = this.computeInsurance(priceWithMileage, typePricing);
      totalPrice = insurance.totalWithInsurance;
      insurancePrice = insurance.insurancePrice;
      insuranceDiscount = insurance.insuranceDiscount;
    }

    const promo = await this.applyPromoCode(dto.promoCode, totalPrice, 'VEHICLE');
    totalPrice = promo.finalAmount;

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        vehicleId,
        startDate: start,
        endDate: end,
        pickupTime: dto.pickupTime || null,
        returnTime: dto.returnTime || null,
        totalPrice,
        status: 'PENDING',
        hasInsurance: dto.hasInsurance ?? false,
        insurancePrice,
        insuranceDiscount,
        mileagePackage: tier,
        mileagePackageCost,
        promoCode: promo.promoCode,
        promoCodeId: promo.promoCodeId,
        promoDiscount: promo.promoDiscount,
      },
      include: {
        vehicle: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });

    const callbackUrl = this.buildCallbackUrl(booking.id);
    const result = await this.geniusPayService.createPayment({
      amount: totalPrice,
      description: `Réservation véhicule — ${vehicle.title || vehicleId}`,
      customer: { email: userEmail, firstName: booking.user?.firstName || undefined, lastName: booking.user?.lastName || undefined },
      success_url: callbackUrl,
      error_url: callbackUrl,
      metadata: {
        paymentType: 'booking',
        entityId: booking.id,
        userId,
        type: 'vehicle',
        vehicleId,
      },
    });

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { paymentReference: result.reference },
      include: {
        vehicle: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });

    return { booking: updated, paymentUrl: result.checkout_url };
  }

  /**
   * Crée une réservation d'appartement PENDING puis initie le paiement GeniusPay.
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
    const nightsPrice = apartment.pricePerNight * days;
    const cleaningFee = apartment.cleaningFee ?? 0;
    let totalPrice = nightsPrice + cleaningFee;

    const promo = await this.applyPromoCode(dto.promoCode, totalPrice, 'APARTMENT');
    totalPrice = promo.finalAmount;

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        apartmentId,
        startDate: start,
        endDate: end,
        totalPrice,
        cleaningFee: cleaningFee > 0 ? cleaningFee : null,
        status: 'PENDING',
        promoCode: promo.promoCode,
        promoCodeId: promo.promoCodeId,
        promoDiscount: promo.promoDiscount,
      },
      include: {
        apartment: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });

    const callbackUrl = this.buildCallbackUrl(booking.id);
    const result = await this.geniusPayService.createPayment({
      amount: totalPrice,
      description: `Réservation logement — ${apartment.title || apartmentId}`,
      customer: { email: userEmail, firstName: booking.user?.firstName || undefined, lastName: booking.user?.lastName || undefined },
      success_url: callbackUrl,
      error_url: callbackUrl,
      metadata: {
        paymentType: 'booking',
        entityId: booking.id,
        userId,
        type: 'apartment',
        apartmentId,
      },
    });

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { paymentReference: result.reference },
      include: {
        apartment: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });

    return { booking: updated, paymentUrl: result.checkout_url };
  }

  /**
   * Vérifie le paiement GeniusPay et confirme la réservation.
   */
  async verifyPayment(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Réservation non trouvée');

    if (booking.status === 'CONFIRMED') {
      const full = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: this.getBookingConfirmationInclude(),
      });
      return { booking: full, status: 'success', message: 'Paiement déjà confirmé' };
    }

    if (!booking.paymentReference) {
      throw new BadRequestException('Aucune référence de paiement associée');
    }

    const verification = await this.geniusPayService.getPayment(booking.paymentReference);

    if (verification.status === 'success') {
      const { transitioned, booking: confirmed } = await this.tryTransitionBookingToConfirmed(bookingId);
      if (!confirmed) throw new NotFoundException('Réservation non trouvée');

      if (transitioned) {
        await this.afterBookingConfirmed(confirmed, bookingId);
        await this.audit.record({
          action: 'booking.confirmed_by_payment',
          entityType: 'Booking',
          entityId: bookingId,
          outcome: 'SUCCESS',
          source: 'SYSTEM',
          summary: 'Réservation confirmée après vérification paiement',
          metadata: { reference: booking.paymentReference },
          before: { status: 'PENDING' },
          after: { status: 'CONFIRMED' },
        });
      }

      return { booking: confirmed, status: 'success', paymentStatus: verification.status };
    }

    if (verification.status === 'failed') {
      await this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } });
      await this.audit.record({
        action: 'booking.cancelled_by_payment',
        entityType: 'Booking',
        entityId: bookingId,
        outcome: 'FAILURE',
        source: 'SYSTEM',
        summary: 'Réservation annulée — paiement échoué',
        metadata: { reference: booking.paymentReference },
      });
      return { booking, status: 'failed', paymentStatus: verification.status };
    }

    return { booking, status: 'pending', paymentStatus: verification.status };
  }

  /**
   * Relance le checkout GeniusPay pour une réservation PENDING (paiement interrompu / expiré).
   * Crée une nouvelle référence et met à jour paymentReference.
   */
  async resumePayment(bookingId: string, userId: string, userEmail: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        vehicle: true,
        apartment: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });

    if (!booking) throw new NotFoundException('Réservation non trouvée');
    if (booking.userId !== userId) {
      throw new ForbiddenException("Vous n'avez pas accès à cette réservation");
    }
    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Seules les réservations en attente de paiement peuvent être réglées');
    }
    if (!booking.totalPrice || booking.totalPrice <= 0) {
      throw new BadRequestException('Montant de réservation invalide');
    }

    const title = booking.vehicle?.title || booking.apartment?.title || bookingId;
    const kind = booking.vehicleId ? 'vehicle' : 'apartment';
    const callbackUrl = this.buildCallbackUrl(booking.id);

    const result = await this.geniusPayService.createPayment({
      amount: booking.totalPrice,
      description: `Réservation ${kind === 'vehicle' ? 'véhicule' : 'appartement'} — ${title}`,
      customer: {
        email: userEmail || booking.user?.email,
        firstName: booking.user?.firstName || undefined,
        lastName: booking.user?.lastName || undefined,
      },
      success_url: callbackUrl,
      error_url: callbackUrl,
      metadata: {
        paymentType: 'booking',
        entityId: booking.id,
        userId,
        type: kind,
        vehicleId: booking.vehicleId || undefined,
        apartmentId: booking.apartmentId || undefined,
        resume: true,
      },
    });

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { paymentReference: result.reference },
      include: {
        vehicle: true,
        apartment: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });

    await this.audit.record({
      action: 'booking.payment_resumed',
      entityType: 'Booking',
      entityId: bookingId,
      outcome: 'SUCCESS',
      source: 'API',
      actorId: userId,
      actorEmail: userEmail || booking.user?.email || undefined,
      summary: 'Checkout GeniusPay relancé pour réservation en attente',
      metadata: { reference: result.reference },
    });

    return { booking: updated, paymentUrl: result.checkout_url };
  }

  /**
   * Activation / annulation depuis le webhook GeniusPay (après re-vérification API).
   */
  async applyPaymentResultFromWebhook(bookingId: string, success: boolean) {
    const existing = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!existing) return { status: 'ok', message: 'Booking not found' };
    if (existing.status === 'CONFIRMED' || existing.status === 'CANCELLED') {
      return { status: 'ok', message: 'Already processed' };
    }

    if (success) {
      const { transitioned, booking: confirmed } = await this.tryTransitionBookingToConfirmed(existing.id, {
        paymentReference: existing.paymentReference || undefined,
      });
      if (transitioned && confirmed) {
        await this.afterBookingConfirmed(confirmed, confirmed.id);
        await this.audit.record({
          action: 'booking.confirmed_by_payment',
          entityType: 'Booking',
          entityId: bookingId,
          outcome: 'SUCCESS',
          source: 'WEBHOOK',
          summary: 'Réservation confirmée via webhook paiement',
          metadata: { reference: existing.paymentReference },
        });
      }
    } else {
      const cancelResult = await this.prisma.booking.updateMany({
        where: { id: existing.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (cancelResult.count === 0) {
        return { status: 'ok', message: 'Already processed' };
      }
      await this.audit.record({
        action: 'booking.cancelled_by_payment',
        entityType: 'Booking',
        entityId: bookingId,
        outcome: 'FAILURE',
        source: 'WEBHOOK',
        summary: 'Réservation annulée via webhook paiement',
        metadata: { reference: existing.paymentReference },
      });
      const cancelled = await this.prisma.booking.findUnique({
        where: { id: existing.id },
        include: {
          vehicle: true,
          apartment: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });
      if (cancelled?.user?.email) {
        this.emailService
          .sendCancellationEmail(cancelled, cancelled.user.email)
          .catch((err) => console.error('[Webhook] Cancellation email error:', err));
      }
    }

    return { status: 'ok' };
  }
}
