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
exports.ReviewsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reviews_service_1 = require("./reviews.service");
const create_review_dto_1 = require("./dto/create-review.dto");
let ReviewsController = class ReviewsController {
    reviewsService;
    constructor(reviewsService) {
        this.reviewsService = reviewsService;
    }
    create(createReviewDto) {
        return this.reviewsService.create(createReviewDto);
    }
    findByVehicle(vehicleId) {
        return this.reviewsService.findByVehicle(vehicleId);
    }
    findByApartment(apartmentId) {
        return this.reviewsService.findByApartment(apartmentId);
    }
    getVehicleRating(vehicleId) {
        return this.reviewsService.getAverageRating(vehicleId);
    }
    getApartmentRating(apartmentId) {
        return this.reviewsService.getAverageRating(undefined, apartmentId);
    }
};
exports.ReviewsController = ReviewsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Créer un commentaire' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Commentaire créé avec succès' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_review_dto_1.CreateReviewDto]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('vehicle/:vehicleId'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les commentaires d\'un véhicule' }),
    (0, swagger_1.ApiParam)({ name: 'vehicleId', description: 'ID du véhicule' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des commentaires récupérée avec succès' }),
    __param(0, (0, common_1.Param)('vehicleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "findByVehicle", null);
__decorate([
    (0, common_1.Get)('apartment/:apartmentId'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les commentaires d\'un appartement' }),
    (0, swagger_1.ApiParam)({ name: 'apartmentId', description: 'ID de l\'appartement' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des commentaires récupérée avec succès' }),
    __param(0, (0, common_1.Param)('apartmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "findByApartment", null);
__decorate([
    (0, common_1.Get)('rating/vehicle/:vehicleId'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer la note moyenne d\'un véhicule' }),
    (0, swagger_1.ApiParam)({ name: 'vehicleId', description: 'ID du véhicule' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Note moyenne récupérée avec succès' }),
    __param(0, (0, common_1.Param)('vehicleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "getVehicleRating", null);
__decorate([
    (0, common_1.Get)('rating/apartment/:apartmentId'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer la note moyenne d\'un appartement' }),
    (0, swagger_1.ApiParam)({ name: 'apartmentId', description: 'ID de l\'appartement' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Note moyenne récupérée avec succès' }),
    __param(0, (0, common_1.Param)('apartmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "getApartmentRating", null);
exports.ReviewsController = ReviewsController = __decorate([
    (0, swagger_1.ApiTags)('reviews'),
    (0, common_1.Controller)('reviews'),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService])
], ReviewsController);
//# sourceMappingURL=reviews.controller.js.map