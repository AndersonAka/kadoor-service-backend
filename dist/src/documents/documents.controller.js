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
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const documents_service_1 = require("./documents.service");
let DocumentsController = class DocumentsController {
    documentsService;
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    async getInvoice(bookingId, res) {
        try {
            const pdfBuffer = await this.documentsService.generateInvoice(bookingId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="facture-${bookingId}.pdf"`);
            res.send(pdfBuffer);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.NotFoundException('Erreur lors de la génération de la facture');
        }
    }
    async getContract(bookingId, res) {
        try {
            const pdfBuffer = await this.documentsService.generateContract(bookingId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="contrat-${bookingId}.pdf"`);
            res.send(pdfBuffer);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.NotFoundException('Erreur lors de la génération du contrat');
        }
    }
    async getReceipt(bookingId, res) {
        try {
            const pdfBuffer = await this.documentsService.generateReceipt(bookingId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="recu-${bookingId}.pdf"`);
            res.send(pdfBuffer);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.NotFoundException('Erreur lors de la génération du reçu');
        }
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Get)('invoice/:bookingId'),
    (0, swagger_1.ApiOperation)({ summary: 'Générer une facture PDF pour une réservation' }),
    (0, swagger_1.ApiParam)({ name: 'bookingId', description: 'ID de la réservation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Facture PDF générée avec succès', content: { 'application/pdf': {} } }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Réservation non trouvée' }),
    __param(0, (0, common_1.Param)('bookingId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getInvoice", null);
__decorate([
    (0, common_1.Get)('contract/:bookingId'),
    (0, swagger_1.ApiOperation)({ summary: 'Générer un contrat PDF pour une réservation' }),
    (0, swagger_1.ApiParam)({ name: 'bookingId', description: 'ID de la réservation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Contrat PDF généré avec succès', content: { 'application/pdf': {} } }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Réservation non trouvée' }),
    __param(0, (0, common_1.Param)('bookingId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getContract", null);
__decorate([
    (0, common_1.Get)('receipt/:bookingId'),
    (0, swagger_1.ApiOperation)({ summary: 'Générer un reçu PDF pour une réservation' }),
    (0, swagger_1.ApiParam)({ name: 'bookingId', description: 'ID de la réservation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reçu PDF généré avec succès', content: { 'application/pdf': {} } }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Réservation non trouvée' }),
    __param(0, (0, common_1.Param)('bookingId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getReceipt", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, swagger_1.ApiTags)('documents'),
    (0, common_1.Controller)('documents'),
    __metadata("design:paramtypes", [documents_service_1.DocumentsService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map