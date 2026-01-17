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
exports.AdminVehiclesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const vehicles_service_1 = require("../vehicles/vehicles.service");
const create_vehicle_dto_1 = require("../vehicles/dto/create-vehicle.dto");
const update_vehicle_dto_1 = require("../vehicles/dto/update-vehicle.dto");
const admin_query_dto_1 = require("./dto/admin-query.dto");
let AdminVehiclesController = class AdminVehiclesController {
    vehiclesService;
    constructor(vehiclesService) {
        this.vehiclesService = vehiclesService;
    }
    findAll(query) {
        return this.vehiclesService.findAll(query);
    }
    findOne(id) {
        return this.vehiclesService.findOne(id);
    }
    create(createVehicleDto) {
        return this.vehiclesService.create(createVehicleDto);
    }
    update(id, updateVehicleDto) {
        return this.vehiclesService.update(id, updateVehicleDto);
    }
    remove(id) {
        return this.vehiclesService.remove(id);
    }
    async uploadImages(id, files) {
        const imageUrls = files.map((file) => `/uploads/vehicles/${file.filename}`);
        const vehicle = await this.vehiclesService.findOne(id);
        const updatedImages = [...(vehicle.images || []), ...imageUrls];
        return this.vehiclesService.update(id, { images: updatedImages });
    }
};
exports.AdminVehiclesController = AdminVehiclesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer la liste des véhicules (admin)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des véhicules récupérée avec succès' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_query_dto_1.AdminQueryDto]),
    __metadata("design:returntype", void 0)
], AdminVehiclesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les détails d\'un véhicule (admin)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID du véhicule' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Détails du véhicule récupérés avec succès' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminVehiclesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Créer un nouveau véhicule' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Véhicule créé avec succès' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_vehicle_dto_1.CreateVehicleDto]),
    __metadata("design:returntype", void 0)
], AdminVehiclesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Modifier un véhicule' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID du véhicule' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Véhicule modifié avec succès' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_vehicle_dto_1.UpdateVehicleDto]),
    __metadata("design:returntype", void 0)
], AdminVehiclesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Supprimer un véhicule' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID du véhicule' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Véhicule supprimé avec succès' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminVehiclesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/images'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload des images pour un véhicule' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID du véhicule' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Images uploadées avec succès' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 10)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], AdminVehiclesController.prototype, "uploadImages", null);
exports.AdminVehiclesController = AdminVehiclesController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin/vehicles'),
    __metadata("design:paramtypes", [vehicles_service_1.VehiclesService])
], AdminVehiclesController);
//# sourceMappingURL=admin-vehicles.controller.js.map