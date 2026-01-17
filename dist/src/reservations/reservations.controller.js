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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reservations_service_1 = require("./reservations.service");
const create_reservation_vehicle_dto_1 = require("./dto/create-reservation-vehicle.dto");
const create_reservation_apartment_dto_1 = require("./dto/create-reservation-apartment.dto");
const passport_1 = require("@nestjs/passport");
let ReservationsController = class ReservationsController {
    reservationsService;
    constructor(reservationsService) {
        this.reservationsService = reservationsService;
    }
    createVehicleReservation(dto, req) {
        if (!req.user || !req.user.userId) {
            throw new common_1.UnauthorizedException('Utilisateur non authentifié');
        }
        const userId = req.user.userId;
        return this.reservationsService.createVehicleReservation(userId, dto);
    }
    createApartmentReservation(dto, req) {
        if (!req.user || !req.user.userId) {
            throw new common_1.UnauthorizedException('Utilisateur non authentifié');
        }
        const userId = req.user.userId;
        return this.reservationsService.createApartmentReservation(userId, dto);
    }
    findAll(userId, status) {
        return this.reservationsService.findAll(userId, status);
    }
    findOne(id) {
        return this.reservationsService.findOne(id);
    }
    updateStatus(id, status) {
        return this.reservationsService.updateStatus(id, status);
    }
    cancel(id) {
        return this.reservationsService.cancel(id);
    }
};
exports.ReservationsController = ReservationsController;
__decorate([
    (0, common_1.Post)('vehicles'),
    (0, swagger_1.ApiOperation)({ summary: 'Créer une réservation de véhicule' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Réservation créée avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Données invalides' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Non autorisé' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Véhicule non disponible pour cette période' }),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_reservation_vehicle_dto_1.CreateReservationVehicleDto, Object]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "createVehicleReservation", null);
__decorate([
    (0, common_1.Post)('apartments'),
    (0, swagger_1.ApiOperation)({ summary: 'Créer une réservation d\'appartement' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Réservation créée avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Données invalides' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Non autorisé' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Appartement non disponible pour cette période' }),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_reservation_apartment_dto_1.CreateReservationApartmentDto, Object]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "createApartmentReservation", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer la liste des réservations' }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false, description: 'Filtrer par ID utilisateur' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, description: 'Filtrer par statut (PENDING, CONFIRMED, CANCELLED, COMPLETED)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des réservations retournée avec succès' }),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les détails d\'une réservation' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de la réservation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Détails de la réservation retournés avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Réservation non trouvée' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReservationsController.prototype, "cancel", null);
exports.ReservationsController = ReservationsController = __decorate([
    (0, swagger_1.ApiTags)('reservations'),
    (0, common_1.Controller)('reservations'),
    __metadata("design:paramtypes", [reservations_service_1.ReservationsService])
], ReservationsController);
//# sourceMappingURL=reservations.controller.js.map