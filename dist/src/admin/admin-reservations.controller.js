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
exports.AdminReservationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reservations_service_1 = require("../reservations/reservations.service");
const admin_query_dto_1 = require("./dto/admin-query.dto");
let AdminReservationsController = class AdminReservationsController {
    reservationsService;
    constructor(reservationsService) {
        this.reservationsService = reservationsService;
    }
    findAll(query) {
        return this.reservationsService.findAll(query.userId, query.status);
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
exports.AdminReservationsController = AdminReservationsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer la liste des réservations (admin)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des réservations récupérée avec succès' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_query_dto_1.AdminQueryDto]),
    __metadata("design:returntype", void 0)
], AdminReservationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les détails d\'une réservation (admin)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de la réservation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Détails de la réservation récupérés avec succès' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminReservationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Modifier le statut d\'une réservation' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de la réservation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statut modifié avec succès' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminReservationsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, swagger_1.ApiOperation)({ summary: 'Annuler une réservation' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de la réservation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Réservation annulée avec succès' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminReservationsController.prototype, "cancel", null);
exports.AdminReservationsController = AdminReservationsController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin/reservations'),
    __metadata("design:paramtypes", [reservations_service_1.ReservationsService])
], AdminReservationsController);
//# sourceMappingURL=admin-reservations.controller.js.map