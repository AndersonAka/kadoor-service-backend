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
const prisma_service_1 = require("../prisma/prisma.service");
const vehicles_service_1 = require("../vehicles/vehicles.service");
const apartments_service_1 = require("../apartments/apartments.service");
const email_service_1 = require("../email/email.service");
let ReservationsService = class ReservationsService {
    prisma;
    vehiclesService;
    apartmentsService;
    emailService;
    constructor(prisma, vehiclesService, apartmentsService, emailService) {
        this.prisma = prisma;
        this.vehiclesService = vehiclesService;
        this.apartmentsService = apartmentsService;
        this.emailService = emailService;
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
        return this.prisma.booking.update({
            where: { id },
            data: { status },
        });
    }
    async cancel(id) {
        return this.updateStatus(id, 'CANCELLED');
    }
};
exports.ReservationsService = ReservationsService;
exports.ReservationsService = ReservationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        vehicles_service_1.VehiclesService,
        apartments_service_1.ApartmentsService,
        email_service_1.EmailService])
], ReservationsService);
//# sourceMappingURL=reservations.service.js.map