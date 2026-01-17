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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    async getDashboardStats() {
        return this.adminService.getDashboardStats();
    }
    async getChartData(period = 'month') {
        return this.adminService.getChartData(period);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('dashboard/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les statistiques du dashboard admin' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Statistiques récupérées avec succès' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('dashboard/charts'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer les données pour les graphiques' }),
    (0, swagger_1.ApiQuery)({ name: 'period', enum: ['day', 'week', 'month', 'year'], required: false, description: 'Période pour les graphiques' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Données des graphiques récupérées avec succès' }),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getChartData", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map