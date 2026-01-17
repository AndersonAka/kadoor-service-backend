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
exports.AdminClientsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const prisma_service_1 = require("../prisma/prisma.service");
const admin_query_dto_1 = require("./dto/admin-query.dto");
let AdminClientsController = class AdminClientsController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where = {};
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }
        const skip = (page - 1) * limit;
        const [clients, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    createdAt: true,
                    _count: {
                        select: {
                            bookings: true,
                        },
                    },
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        return {
            data: clients,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const client = await this.prisma.user.findUnique({
            where: { id },
            include: {
                bookings: {
                    include: {
                        vehicle: {
                            select: {
                                id: true,
                                title: true,
                                type: true,
                            },
                        },
                        apartment: {
                            select: {
                                id: true,
                                title: true,
                                type: true,
                                city: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
                reviews: {
                    include: {
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
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        });
        if (!client) {
            throw new Error('Client non trouvé');
        }
        const totalSpent = client.bookings
            .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
            .reduce((sum, b) => sum + b.totalPrice, 0);
        const bookingsCount = client.bookings.length;
        const completedBookings = client.bookings.filter((b) => b.status === 'COMPLETED').length;
        return {
            ...client,
            stats: {
                totalSpent,
                bookingsCount,
                completedBookings,
                averageRating: client.reviews.length > 0
                    ? client.reviews.reduce((sum, r) => sum + r.rating, 0) / client.reviews.length
                    : 0,
            },
        };
    }
    async getClientBookings(id, query) {
        const { page = 1, limit = 10, status } = query;
        const skip = (page - 1) * limit;
        const where = { userId: id };
        if (status) {
            where.status = status;
        }
        const [bookings, total] = await Promise.all([
            this.prisma.booking.findMany({
                where,
                skip,
                take: limit,
                include: {
                    vehicle: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                        },
                    },
                    apartment: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                            city: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            this.prisma.booking.count({ where }),
        ]);
        return {
            data: bookings,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
};
exports.AdminClientsController = AdminClientsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer la liste des clients' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Liste des clients récupérée avec succès' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [admin_query_dto_1.AdminQueryDto]),
    __metadata("design:returntype", Promise)
], AdminClientsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer le profil détaillé d\'un client' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID du client' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profil client récupéré avec succès' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminClientsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/bookings'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer l\'historique des réservations d\'un client' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'ID du client' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Historique des réservations récupéré avec succès' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, admin_query_dto_1.AdminQueryDto]),
    __metadata("design:returntype", Promise)
], AdminClientsController.prototype, "getClientBookings", null);
exports.AdminClientsController = AdminClientsController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, common_1.Controller)('admin/clients'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminClientsController);
//# sourceMappingURL=admin-clients.controller.js.map