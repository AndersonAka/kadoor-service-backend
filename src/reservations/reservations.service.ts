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
import { SettingsService } from '../settings/settings.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { v4 as uuidv4 } from 'uuid';

/** Clés SiteSettings — assurance véhicule */
const INSURANCE_PRICE_KEY = 'vehicleInsurancePrice';
const INSURANCE_DISCOUNT_KEY = 'vehicleInsuranceDiscountPercent';

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
    private paystackService: PaystackService,
    private configService: ConfigService,
    private settingsService: SettingsService,
    private promoCodesService: PromoCodesService,
  ) {}

  /**
   * Calcule le nombre de jours entre deux dates
   */
  private calculateDays(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Logique de nuitée : 27/04 → 03/05 = 6 jours facturés (pas 7)
    return Math.max(diffDays - 1, 1);
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
   * Calcule le supplément assurance et la réduction appliquée au prix de base.
   * - insurancePrice  : montant fixe ajouté (lu dans SiteSettings, défaut 15 000 FCFA)
   * - discountPercent : taux de réduction sur le prix de base (lu dans SiteSettings, défaut 0 %)
   * Formule : totalPrice = basePrice * (1 - discount%) + insurancePrice
   */
  private async computeInsurance(basePrice: number): Promise<{
    insurancePrice: number;
    insuranceDiscount: number;
    totalWithInsurance: number;
  }> {
    const insurancePrice = await this.getNumericSetting(INSURANCE_PRICE_KEY, 15_000);
    const discountPercent = await this.getNumericSetting(INSURANCE_DISCOUNT_KEY, 0);

    const insuranceDiscount = Math.round(basePrice * (discountPercent / 100));
    const totalWithInsurance = basePrice - insuranceDiscount + insurancePrice;

    return { insurancePrice, insuranceDiscount, totalWithInsurance };
  }

  /**
   * Calcule le coût d'un forfait kilométrique sur la durée du séjour.
   * coût = kmInclus_par_jour × prixParKm × nbJours
   */
  private async computeMileageCost(
    tier: 'TIER1' | 'TIER2' | 'TIER3',
    days: number,
  ): Promise<number> {
    let kmKey: string, priceKey: string, defaultKm: number, defaultPrice: number;

    if (tier === 'TIER1') {
      kmKey = MILEAGE_TIER1_KM_KEY; priceKey = MILEAGE_TIER1_PRICE_KEY; defaultKm = 100; defaultPrice = 300;
    } else if (tier === 'TIER2') {
      kmKey = MILEAGE_TIER2_KM_KEY; priceKey = MILEAGE_TIER2_PRICE_KEY; defaultKm = 200; defaultPrice = 270;
    } else {
      kmKey = MILEAGE_TIER3_KM_KEY; priceKey = MILEAGE_TIER3_PRICE_KEY; defaultKm = 250; defaultPrice = 280;
    }

    const kmPerDay    = await this.getNumericSetting(kmKey, defaultKm);
    const pricePerKm  = await this.getNumericSetting(priceKey, defaultPrice);

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
   * Évite les doubles envois d'email lorsque verifyPayment et le webhook Paystack
   * (ou des retries webhook) arrivent en concurrence.
   */
  private async tryTransitionBookingToConfirmed(
    bookingId: string,
    options?: { paystackReference?: string },
  ) {
    const where: { id: string; status: string; paystackReference?: string } = {
      id: bookingId,
      status: 'PENDING',
    };
    if (options?.paystackReference) {
      where.paystackReference = options.paystackReference;
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
    const basePrice = vehicle.pricePerDay * days;
    const paystackReference = uuidv4();

    // 1. Forfait kilométrique (s'ajoute au prix de base)
    let mileagePackageCost: number | null = null;
    if (dto.mileagePackage) {
      mileagePackageCost = await this.computeMileageCost(dto.mileagePackage as 'TIER1' | 'TIER2' | 'TIER3', days);
    }

    // 2. Prix intermédiaire : base + forfait km
    const priceWithMileage = basePrice + (mileagePackageCost ?? 0);

    // 3. Option assurance (réduction sur le prix intermédiaire + montant fixe)
    let totalPrice = priceWithMileage;
    let insurancePrice: number | null = null;
    let insuranceDiscount: number | null = null;

    if (dto.hasInsurance) {
      const insurance = await this.computeInsurance(priceWithMileage);
      totalPrice = insurance.totalWithInsurance;
      insurancePrice = insurance.insurancePrice;
      insuranceDiscount = insurance.insuranceDiscount;
    }

    // 4. Code promo (s'applique sur le total après assurance)
    const promo = await this.applyPromoCode(dto.promoCode, totalPrice, 'VEHICLE');
    totalPrice = promo.finalAmount;

    const booking = await this.prisma.booking.create({
      data: {
        userId,
        vehicleId,
        startDate: start,
        endDate: end,
        totalPrice,
        status: 'PENDING',
        paystackReference,
        hasInsurance: dto.hasInsurance ?? false,
        insurancePrice,
        insuranceDiscount,
        mileagePackage: dto.mileagePackage ?? null,
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
    const nightsPrice = apartment.pricePerNight * days;
    const cleaningFee = apartment.cleaningFee ?? 0;
    let totalPrice = nightsPrice + cleaningFee;
    const paystackReference = uuidv4();

    // Code promo
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
        paystackReference,
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
      const full = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: this.getBookingConfirmationInclude(),
      });
      return { booking: full, status: 'success', message: 'Paiement déjà confirmé' };
    }

    if (!booking.paystackReference) {
      throw new BadRequestException('Aucune référence de paiement associée');
    }

    const verification = await this.paystackService.verifyTransaction(booking.paystackReference);

    if (verification.status === 'success') {
      const { transitioned, booking: confirmed } = await this.tryTransitionBookingToConfirmed(bookingId);
      if (!confirmed) throw new NotFoundException('Réservation non trouvée');

      // Un seul flux (verifyPayment ou webhook) envoie l'email après la transition atomique
      // (pas d'email de paiement : Paystack notifie déjà le client)
      if (transitioned && confirmed.user?.email) {
        this.emailService.sendReservationConfirmation(confirmed, confirmed.user.email).catch(
          (err) => console.error('Erreur email confirmation réservation:', err),
        );

        // Incrémente l'utilisation du code promo (une seule fois)
        if (confirmed.promoCodeId) {
          this.promoCodesService
            .incrementUsage(confirmed.promoCodeId)
            .catch((err) => console.error('[verifyPayment] Promo usage error:', err));
        }

        this.notificationsService
          .sendReservationConfirmation(confirmed.userId, bookingId, confirmed.vehicle ? 'vehicle' : 'apartment')
          .catch((err) => console.error('[verifyPayment] Push notification error:', err));
      }

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
        const { transitioned, booking: confirmed } = await this.tryTransitionBookingToConfirmed(existing.id, {
          paystackReference: reference,
        });
        if (transitioned && confirmed?.user?.email) {
          this.emailService
            .sendReservationConfirmation(confirmed, confirmed.user.email)
            .catch((err) => console.error('[Webhook] Reservation confirmation email error:', err));

          if (confirmed.promoCodeId) {
            this.promoCodesService
              .incrementUsage(confirmed.promoCodeId)
              .catch((err) => console.error('[Webhook] Promo usage error:', err));
          }

          this.notificationsService
            .sendReservationConfirmation(confirmed.userId, confirmed.id, confirmed.vehicle ? 'vehicle' : 'apartment')
            .catch((err) => console.error('[Webhook] Push notification error:', err));
        }
      } else {
        const cancelResult = await this.prisma.booking.updateMany({
          where: { id: existing.id, status: 'PENDING', paystackReference: reference },
          data: { status: 'CANCELLED' },
        });
        if (cancelResult.count === 0) {
          return { status: 'ok', message: 'Already processed' };
        }
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
    }

    return { status: 'ok' };
  }
}
