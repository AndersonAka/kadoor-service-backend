"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentsModule = void 0;
const common_1 = require("@nestjs/common");
const incidents_service_1 = require("./incidents.service");
const incidents_controller_1 = require("./incidents.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const email_module_1 = require("../email/email.module");
const vehicles_module_1 = require("../vehicles/vehicles.module");
const apartments_module_1 = require("../apartments/apartments.module");
const auth_module_1 = require("../auth/auth.module");
let IncidentsModule = class IncidentsModule {
};
exports.IncidentsModule = IncidentsModule;
exports.IncidentsModule = IncidentsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, email_module_1.EmailModule, vehicles_module_1.VehiclesModule, apartments_module_1.ApartmentsModule, auth_module_1.AuthModule],
        providers: [incidents_service_1.IncidentsService],
        controllers: [incidents_controller_1.IncidentsController],
        exports: [incidents_service_1.IncidentsService],
    })
], IncidentsModule);
//# sourceMappingURL=incidents.module.js.map