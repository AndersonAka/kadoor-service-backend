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
exports.ApartmentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const apartments_service_1 = require("./apartments.service");
const create_apartment_dto_1 = require("./dto/create-apartment.dto");
const update_apartment_dto_1 = require("./dto/update-apartment.dto");
const query_apartments_dto_1 = require("./dto/query-apartments.dto");
const check_availability_dto_1 = require("./dto/check-availability.dto");
let ApartmentsController = class ApartmentsController {
    apartmentsService;
    constructor(apartmentsService) {
        this.apartmentsService = apartmentsService;
    }
    create(createApartmentDto) {
        return this.apartmentsService.create(createApartmentDto);
    }
    findAll(query) {
        return this.apartmentsService.findAll(query);
    }
    findOne(id) {
        return this.apartmentsService.findOne(id);
    }
    checkAvailability(id, checkAvailabilityDto) {
        return this.apartmentsService.checkAvailability(id, checkAvailabilityDto.startDate, checkAvailabilityDto.endDate);
    }
    update(id, updateApartmentDto) {
        return this.apartmentsService.update(id, updateApartmentDto);
    }
    remove(id) {
        return this.apartmentsService.remove(id);
    }
};
exports.ApartmentsController = ApartmentsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_apartment_dto_1.CreateApartmentDto]),
    __metadata("design:returntype", void 0)
], ApartmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer la liste des appartements avec filtres et pagination' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des appartements retournée avec succès' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_apartments_dto_1.QueryApartmentsDto]),
    __metadata("design:returntype", void 0)
], ApartmentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les détails d\'un appartement' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de l\'appartement' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Détails de l\'appartement retournés avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Appartement non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApartmentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/availability'),
    (0, swagger_1.ApiOperation)({ summary: 'Vérifier la disponibilité d\'un appartement pour une période' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de l\'appartement' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', description: 'Date de début (ISO 8601)' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', description: 'Date de fin (ISO 8601)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Disponibilité vérifiée avec succès' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, check_availability_dto_1.CheckAvailabilityDto]),
    __metadata("design:returntype", void 0)
], ApartmentsController.prototype, "checkAvailability", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_apartment_dto_1.UpdateApartmentDto]),
    __metadata("design:returntype", void 0)
], ApartmentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApartmentsController.prototype, "remove", null);
exports.ApartmentsController = ApartmentsController = __decorate([
    (0, swagger_1.ApiTags)('apartments'),
    (0, common_1.Controller)('apartments'),
    __metadata("design:paramtypes", [apartments_service_1.ApartmentsService])
], ApartmentsController);
//# sourceMappingURL=apartments.controller.js.map