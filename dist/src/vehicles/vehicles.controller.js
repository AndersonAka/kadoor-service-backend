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
exports.VehiclesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const vehicles_service_1 = require("./vehicles.service");
const create_vehicle_dto_1 = require("./dto/create-vehicle.dto");
const update_vehicle_dto_1 = require("./dto/update-vehicle.dto");
const query_vehicles_dto_1 = require("./dto/query-vehicles.dto");
const check_availability_dto_1 = require("./dto/check-availability.dto");
let VehiclesController = class VehiclesController {
    vehiclesService;
    constructor(vehiclesService) {
        this.vehiclesService = vehiclesService;
    }
    create(createVehicleDto) {
        return this.vehiclesService.create(createVehicleDto);
    }
    findAll(query) {
        return this.vehiclesService.findAll(query);
    }
    findOne(id) {
        return this.vehiclesService.findOne(id);
    }
    checkAvailability(id, checkAvailabilityDto) {
        return this.vehiclesService.checkAvailability(id, checkAvailabilityDto.startDate, checkAvailabilityDto.endDate);
    }
    update(id, updateVehicleDto) {
        return this.vehiclesService.update(id, updateVehicleDto);
    }
    remove(id) {
        return this.vehiclesService.remove(id);
    }
};
exports.VehiclesController = VehiclesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_vehicle_dto_1.CreateVehicleDto]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer la liste des véhicules avec filtres et pagination' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des véhicules retournée avec succès' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_vehicles_dto_1.QueryVehiclesDto]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les détails d\'un véhicule' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID du véhicule' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Détails du véhicule retournés avec succès' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Véhicule non trouvé' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/availability'),
    (0, swagger_1.ApiOperation)({ summary: 'Vérifier la disponibilité d\'un véhicule pour une période' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID du véhicule' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', description: 'Date de début (ISO 8601)' }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', description: 'Date de fin (ISO 8601)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Disponibilité vérifiée avec succès' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, check_availability_dto_1.CheckAvailabilityDto]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "checkAvailability", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_vehicle_dto_1.UpdateVehicleDto]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "remove", null);
exports.VehiclesController = VehiclesController = __decorate([
    (0, swagger_1.ApiTags)('vehicles'),
    (0, common_1.Controller)('vehicles'),
    __metadata("design:paramtypes", [vehicles_service_1.VehiclesService])
], VehiclesController);
//# sourceMappingURL=vehicles.controller.js.map