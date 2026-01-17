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
exports.IncidentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const incidents_service_1 = require("./incidents.service");
const create_incident_dto_1 = require("./dto/create-incident.dto");
const passport_1 = require("@nestjs/passport");
const jwt_optional_guard_1 = require("../auth/jwt-optional.guard");
let IncidentsController = class IncidentsController {
    incidentsService;
    constructor(incidentsService) {
        this.incidentsService = incidentsService;
    }
    createIncident(dto, req) {
        const userId = req.user?.userId || null;
        return this.incidentsService.create(dto, userId);
    }
    findAll(userId, status, req) {
        const currentUserId = req?.user?.userId;
        const filterUserId = req?.user?.role === 'ADMIN' ? userId : currentUserId;
        return this.incidentsService.findAll(filterUserId, status);
    }
    findOne(id) {
        return this.incidentsService.findOne(id);
    }
    updateStatus(id, status) {
        return this.incidentsService.updateStatus(id, status);
    }
};
exports.IncidentsController = IncidentsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Déclarer un incident' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Incident déclaré avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Données invalides' }),
    (0, common_1.UseGuards)(jwt_optional_guard_1.JwtOptionalGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_incident_dto_1.CreateIncidentDto, Object]),
    __metadata("design:returntype", void 0)
], IncidentsController.prototype, "createIncident", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer la liste des incidents' }),
    (0, swagger_1.ApiQuery)({ name: 'userId', required: false, description: 'Filtrer par ID utilisateur' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, description: 'Filtrer par statut' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des incidents retournée avec succès' }),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], IncidentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les détails d\'un incident' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de l\'incident' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Détails de l\'incident retournés avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Incident non trouvé' }),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IncidentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Mettre à jour le statut d\'un incident' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de l\'incident' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statut mis à jour avec succès' }),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], IncidentsController.prototype, "updateStatus", null);
exports.IncidentsController = IncidentsController = __decorate([
    (0, swagger_1.ApiTags)('incidents'),
    (0, common_1.Controller)('incidents'),
    __metadata("design:paramtypes", [incidents_service_1.IncidentsService])
], IncidentsController);
//# sourceMappingURL=incidents.controller.js.map