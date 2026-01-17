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
exports.AdminApartmentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const apartments_service_1 = require("../apartments/apartments.service");
const create_apartment_dto_1 = require("../apartments/dto/create-apartment.dto");
const update_apartment_dto_1 = require("../apartments/dto/update-apartment.dto");
const admin_query_dto_1 = require("./dto/admin-query.dto");
let AdminApartmentsController = class AdminApartmentsController {
    apartmentsService;
    constructor(apartmentsService) {
        this.apartmentsService = apartmentsService;
    }
    findAll(query) {
        return this.apartmentsService.findAll(query);
    }
    findOne(id) {
        return this.apartmentsService.findOne(id);
    }
    create(createApartmentDto) {
        return this.apartmentsService.create(createApartmentDto);
    }
    update(id, updateApartmentDto) {
        return this.apartmentsService.update(id, updateApartmentDto);
    }
    remove(id) {
        return this.apartmentsService.remove(id);
    }
    async uploadImages(id, files) {
        const imageUrls = files.map((file) => `/uploads/apartments/${file.filename}`);
        const apartment = await this.apartmentsService.findOne(id);
        const updatedImages = [...(apartment.images || []), ...imageUrls];
        return this.apartmentsService.update(id, { images: updatedImages });
    }
};
exports.AdminApartmentsController = AdminApartmentsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer la liste des appartements (admin)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des appartements récupérée avec succès' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_query_dto_1.AdminQueryDto]),
    __metadata("design:returntype", void 0)
], AdminApartmentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les détails d\'un appartement (admin)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de l\'appartement' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Détails de l\'appartement récupérés avec succès' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminApartmentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Créer un nouvel appartement' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Appartement créé avec succès' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_apartment_dto_1.CreateApartmentDto]),
    __metadata("design:returntype", void 0)
], AdminApartmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Modifier un appartement' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de l\'appartement' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Appartement modifié avec succès' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_apartment_dto_1.UpdateApartmentDto]),
    __metadata("design:returntype", void 0)
], AdminApartmentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Supprimer un appartement' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de l\'appartement' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Appartement supprimé avec succès' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminApartmentsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/images'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload des images pour un appartement' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID de l\'appartement' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Images uploadées avec succès' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 10)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], AdminApartmentsController.prototype, "uploadImages", null);
exports.AdminApartmentsController = AdminApartmentsController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin/apartments'),
    __metadata("design:paramtypes", [apartments_service_1.ApartmentsService])
], AdminApartmentsController);
//# sourceMappingURL=admin-apartments.controller.js.map