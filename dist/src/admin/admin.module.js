"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const admin_controller_1 = require("./admin.controller");
const admin_vehicles_controller_1 = require("./admin-vehicles.controller");
const admin_apartments_controller_1 = require("./admin-apartments.controller");
const admin_reservations_controller_1 = require("./admin-reservations.controller");
const admin_clients_controller_1 = require("./admin-clients.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const vehicles_module_1 = require("../vehicles/vehicles.module");
const apartments_module_1 = require("../apartments/apartments.module");
const reservations_module_1 = require("../reservations/reservations.module");
const users_module_1 = require("../users/users.module");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            vehicles_module_1.VehiclesModule,
            apartments_module_1.ApartmentsModule,
            reservations_module_1.ReservationsModule,
            users_module_1.UsersModule,
        ],
        providers: [admin_service_1.AdminService],
        controllers: [
            admin_controller_1.AdminController,
            admin_vehicles_controller_1.AdminVehiclesController,
            admin_apartments_controller_1.AdminApartmentsController,
            admin_reservations_controller_1.AdminReservationsController,
            admin_clients_controller_1.AdminClientsController,
        ],
        exports: [admin_service_1.AdminService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map