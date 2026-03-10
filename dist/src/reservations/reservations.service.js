"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const vehicles_service_1 = require("../vehicles/vehicles.service");
const apartments_service_1 = require("../apartments/apartments.service");
const email_service_1 = require("../email/email.service");
const notifications_service_1 = require("../notifications/notifications.service");
const paystack_service_1 = require("./paystack.service");
const uuid_1 = require("uuid");
let ReservationsService = class ReservationsService {
    prisma;
    vehiclesService;
    apartmentsService;
    emailService;
    notificationsService;
    paystackService;
    configService;
    constructor(prisma, vehiclesService, apartmentsService, emailService, notificationsService, paystackService, configService) {
        this.prisma = prisma;
        this.vehiclesService = vehiclesService;
        this.apartmentsService = apartmentsService;
        this.emailService = emailService;
        this.notificationsService = notificationsService;
        this.paystackService = paystackService;
        this.configService = configService;
    }
    calculateDays(startDate, endDate) {
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays || 1;
    }
    async createVehicleReservation(userId, dto) {
        const { vehicleId, startDate, endDate } = dto;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) {
            throw new common_1.BadRequestException('La date de fin doit être après la date de début');
        }
        if (start < new Date()) {
            throw new common_1.BadRequestException('La date de début ne peut pas être dans le passé');
        }
        const availability = await this.vehiclesService.checkAvailability(vehicleId, startDate, endDate);
        if (!availability.available) {
            throw new common_1.ConflictException(`Le véhicule n'est pas disponible pour cette période. ${availability.reason || ''}`);
        }
        const vehicle = await this.vehiclesService.findOne(vehicleId);
        if (!vehicle) {
            throw new common_1.NotFoundException('Véhicule non trouvé');
        }
        const days = this.calculateDays(start, end);
        const basePrice = vehicle.pricePerDay * days;
        const totalPrice = basePrice;
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
        this.emailService.sendReservationConfirmation(reservation, reservation.user.email).catch((error) => console.error('Erreur envoi email confirmation:', error));
        return reservation;
    }
    async createApartmentReservation(userId, dto) {
        const { apartmentId, startDate, endDate } = dto;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) {
            throw new common_1.BadRequestException('La date de fin doit être après la date de début');
        }
        if (start < new Date()) {
            throw new common_1.BadRequestException('La date de début ne peut pas être dans le passé');
        }
        const availability = await this.apartmentsService.checkAvailability(apartmentId, startDate, endDate);
        if (!availability.available) {
            throw new common_1.ConflictException(`L'appartement n'est pas disponible pour cette période. ${availability.reason || ''}`);
        }
        const apartment = await this.apartmentsService.findOne(apartmentId);
        if (!apartment) {
            throw new common_1.NotFoundException('Appartement non trouvé');
        }
        const days = this.calculateDays(start, end);
        const basePrice = apartment.pricePerNight * days;
        const totalPrice = basePrice;
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
        this.emailService.sendReservationConfirmation(reservation, reservation.user.email).catch((error) => console.error('Erreur envoi email confirmation:', error));
        return reservation;
    }
    async findAll(userId, status) {
        const where = {};
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
    async findOne(id) {
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
            throw new common_1.NotFoundException(`Réservation avec l'ID ${id} non trouvée`);
        }
        return reservation;
    }
    async updateStatus(id, status) {
        const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
        if (!validStatuses.includes(status)) {
            throw new common_1.BadRequestException(`Statut invalide. Statuts valides: ${validStatuses.join(', ')}`);
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
    async cancel(id) {
        return this.updateStatus(id, 'CANCELLED');
    }
    buildCallbackUrl(bookingId) {
        const webAppUrl = this.configService.get('WEB_APP_URL') || 'http://localhost:3000';
        const defaultLocale = this.configService.get('WEB_APP_DEFAULT_LOCALE') || 'fr';
        return `${webAppUrl}/${defaultLocale}/payment/callback?bookingId=${bookingId}`;
    }
    async initiateVehiclePayment(userId, userEmail, dto) {
        const { vehicleId, startDate, endDate } = dto;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end)
            throw new common_1.BadRequestException('La date de fin doit être après la date de début');
        if (start < new Date())
            throw new common_1.BadRequestException('La date de début ne peut pas être dans le passé');
        const availability = await this.vehiclesService.checkAvailability(vehicleId, startDate, endDate);
        if (!availability.available) {
            throw new common_1.ConflictException(`Le véhicule n'est pas disponible. ${availability.reason || ''}`);
        }
        const vehicle = await this.vehiclesService.findOne(vehicleId);
        if (!vehicle)
            throw new common_1.NotFoundException('Véhicule non trouvé');
        const days = this.calculateDays(start, end);
        const totalPrice = vehicle.pricePerDay * days;
        const paystackReference = (0, uuid_1.v4)();
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
    async initiateApartmentPayment(userId, userEmail, dto) {
        const { apartmentId, startDate, endDate } = dto;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end)
            throw new common_1.BadRequestException('La date de fin doit être après la date de début');
        if (start < new Date())
            throw new common_1.BadRequestException('La date de début ne peut pas être dans le passé');
        const availability = await this.apartmentsService.checkAvailability(apartmentId, startDate, endDate);
        if (!availability.available) {
            throw new common_1.ConflictException(`L'appartement n'est pas disponible. ${availability.reason || ''}`);
        }
        const apartment = await this.apartmentsService.findOne(apartmentId);
        if (!apartment)
            throw new common_1.NotFoundException('Appartement non trouvé');
        const days = this.calculateDays(start, end);
        const totalPrice = apartment.pricePerNight * days;
        const paystackReference = (0, uuid_1.v4)();
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
    async verifyPayment(bookingId) {
        const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new common_1.NotFoundException('Réservation non trouvée');
        if (booking.status === 'CONFIRMED') {
            return { booking, status: 'success', message: 'Paiement déjà confirmé' };
        }
        if (!booking.paystackReference) {
            throw new common_1.BadRequestException('Aucune référence de paiement associée');
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
            this.emailService.sendReservationConfirmation(confirmed, confirmed.user.email).catch((err) => console.error('Erreur email confirmation:', err));
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
    async handleWebhook(signature, rawBody, body) {
        const isValid = this.paystackService.validateWebhookSignature(signature, rawBody);
        if (!isValid)
            return { status: 'error', message: 'Invalid signature' };
        if (body.event === 'charge.success' || body.event === 'charge.failed') {
            const reference = body.data?.reference;
            if (!reference)
                return { status: 'error', message: 'No reference' };
            const existing = await this.prisma.booking.findFirst({ where: { paystackReference: reference } });
            if (!existing)
                return { status: 'ok', message: 'Booking not found' };
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
            }
            else {
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
};
exports.ReservationsService = ReservationsService;
exports.ReservationsService = ReservationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        vehicles_service_1.VehiclesService,
        apartments_service_1.ApartmentsService,
        email_service_1.EmailService,
        notifications_service_1.NotificationsService,
        paystack_service_1.PaystackService,
        config_1.ConfigService])
], ReservationsService);
//# sourceMappingURL=reservations.service.js.map