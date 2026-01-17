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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
let IncidentsService = class IncidentsService {
    prisma;
    emailService;
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
    }
    async create(createIncidentDto, userId) {
        const incident = await this.prisma.incident.create({
            data: {
                type: createIncidentDto.type,
                title: createIncidentDto.title,
                description: createIncidentDto.description,
                location: createIncidentDto.location,
                date: createIncidentDto.date ? new Date(createIncidentDto.date) : null,
                firstName: createIncidentDto.firstName,
                lastName: createIncidentDto.lastName,
                email: createIncidentDto.email,
                phone: createIncidentDto.phone,
                userId: userId || null,
                vehicleId: createIncidentDto.vehicleId || null,
                apartmentId: createIncidentDto.apartmentId || null,
                images: createIncidentDto.images || [],
                status: 'PENDING',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                vehicle: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                apartment: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
        this.emailService
            .sendIncidentAcknowledgement(incident)
            .catch((error) => console.error('Erreur envoi email accusé de réception:', error));
        return incident;
    }
    async findAll(userId, status) {
        const where = {};
        if (userId) {
            where.userId = userId;
        }
        if (status) {
            where.status = status;
        }
        return this.prisma.incident.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                vehicle: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                apartment: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
    }
    async findOne(id) {
        const incident = await this.prisma.incident.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                vehicle: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                apartment: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
        if (!incident) {
            throw new common_1.NotFoundException('Incident non trouvé');
        }
        return incident;
    }
    async updateStatus(id, status) {
        const incident = await this.findOne(id);
        return this.prisma.incident.update({
            where: { id },
            data: { status: status },
        });
    }
};
exports.IncidentsService = IncidentsService;
exports.IncidentsService = IncidentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], IncidentsService);
//# sourceMappingURL=incidents.service.js.map