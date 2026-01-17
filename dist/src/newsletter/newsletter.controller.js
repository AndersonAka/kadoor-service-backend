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
exports.NewsletterController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const newsletter_service_1 = require("./newsletter.service");
const subscribe_newsletter_dto_1 = require("./dto/subscribe-newsletter.dto");
let NewsletterController = class NewsletterController {
    newsletterService;
    constructor(newsletterService) {
        this.newsletterService = newsletterService;
    }
    subscribe(subscribeDto) {
        return this.newsletterService.subscribe(subscribeDto);
    }
    unsubscribe(email) {
        return this.newsletterService.unsubscribe(email);
    }
    findAll() {
        return this.newsletterService.findAll();
    }
};
exports.NewsletterController = NewsletterController;
__decorate([
    (0, common_1.Post)('subscribe'),
    (0, swagger_1.ApiOperation)({ summary: "S'abonner à la newsletter" }),
    (0, swagger_1.ApiBody)({ type: subscribe_newsletter_dto_1.SubscribeNewsletterDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Abonnement réussi' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email déjà abonné' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [subscribe_newsletter_dto_1.SubscribeNewsletterDto]),
    __metadata("design:returntype", void 0)
], NewsletterController.prototype, "subscribe", null);
__decorate([
    (0, common_1.Delete)('unsubscribe/:email'),
    (0, swagger_1.ApiOperation)({ summary: "Se désabonner de la newsletter" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Désabonnement réussi' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Email non trouvé' }),
    __param(0, (0, common_1.Param)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], NewsletterController.prototype, "unsubscribe", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer tous les abonnés (admin)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des abonnés' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NewsletterController.prototype, "findAll", null);
exports.NewsletterController = NewsletterController = __decorate([
    (0, swagger_1.ApiTags)('newsletter'),
    (0, common_1.Controller)('newsletter'),
    __metadata("design:paramtypes", [newsletter_service_1.NewsletterService])
], NewsletterController);
//# sourceMappingURL=newsletter.controller.js.map