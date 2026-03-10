"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReservationsModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const reservations_service_1 = require("./reservations.service");
const reservations_controller_1 = require("./reservations.controller");
const paystack_service_1 = require("./paystack.service");
const prisma_module_1 = require("../prisma/prisma.module");
const vehicles_module_1 = require("../vehicles/vehicles.module");
const apartments_module_1 = require("../apartments/apartments.module");
const documents_module_1 = require("../documents/documents.module");
const email_module_1 = require("../email/email.module");
const auth_module_1 = require("../auth/auth.module");
const notifications_module_1 = require("../notifications/notifications.module");
let ReservationsModule = class ReservationsModule {
};
exports.ReservationsModule = ReservationsModule;
exports.ReservationsModule = ReservationsModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, prisma_module_1.PrismaModule, vehicles_module_1.VehiclesModule, apartments_module_1.ApartmentsModule, documents_module_1.DocumentsModule, email_module_1.EmailModule, auth_module_1.AuthModule, notifications_module_1.NotificationsModule],
        providers: [reservations_service_1.ReservationsService, paystack_service_1.PaystackService],
        controllers: [reservations_controller_1.ReservationsController],
        exports: [reservations_service_1.ReservationsService],
    })
], ReservationsModule);
//# sourceMappingURL=reservations.module.js.map