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
exports.VehiclesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let VehiclesService = class VehiclesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(createVehicleDto) {
        return this.prisma.vehicle.create({
            data: createVehicleDto,
        });
    }
    async findAll(query) {
        const { type, location, minPrice, maxPrice, search, page = 1, limit = 10, } = query;
        const where = {
            isAvailable: true,
        };
        if (type) {
            where.type = type;
        }
        if (location) {
            where.location = {
                contains: location,
                mode: client_1.Prisma.QueryMode.insensitive,
            };
        }
        if (minPrice !== undefined || maxPrice !== undefined) {
            where.pricePerDay = {};
            if (minPrice !== undefined) {
                where.pricePerDay.gte = minPrice;
            }
            if (maxPrice !== undefined) {
                where.pricePerDay.lte = maxPrice;
            }
        }
        if (search) {
            const searchConditions = [
                { title: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
                { description: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } },
            ];
            searchConditions.push({ make: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } }, { model: { contains: search, mode: client_1.Prisma.QueryMode.insensitive } });
            where.OR = searchConditions;
        }
        const skip = (page - 1) * limit;
        const [vehicles, total] = await Promise.all([
            this.prisma.vehicle.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.vehicle.count({ where }),
        ]);
        return {
            data: vehicles,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const vehicle = await this.prisma.vehicle.findUnique({
            where: { id },
            include: {
                bookings: {
                    where: {
                        status: {
                            in: ['PENDING', 'CONFIRMED'],
                        },
                    },
                    select: {
                        startDate: true,
                        endDate: true,
                        status: true,
                    },
                },
            },
        });
        if (!vehicle) {
            throw new common_1.NotFoundException(`Véhicule avec l'ID ${id} non trouvé`);
        }
        return vehicle;
    }
    async checkAvailability(id, startDate, endDate) {
        const vehicle = await this.findOne(id);
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start >= end) {
            return {
                available: false,
                reason: 'La date de fin doit être après la date de début',
            };
        }
        const conflictingBookings = await this.prisma.booking.findFirst({
            where: {
                vehicleId: id,
                status: {
                    in: ['PENDING', 'CONFIRMED'],
                },
                OR: [
                    {
                        startDate: {
                            gte: start,
                            lte: end,
                        },
                    },
                    {
                        endDate: {
                            gte: start,
                            lte: end,
                        },
                    },
                    {
                        AND: [
                            { startDate: { lte: start } },
                            { endDate: { gte: end } },
                        ],
                    },
                ],
            },
        });
        const available = !conflictingBookings && vehicle.isAvailable;
        return {
            available,
            vehicleId: id,
            startDate,
            endDate,
            conflictingBooking: conflictingBookings || null,
        };
    }
    update(id, updateVehicleDto) {
        return this.prisma.vehicle.update({
            where: { id },
            data: updateVehicleDto,
        });
    }
    remove(id) {
        return this.prisma.vehicle.delete({
            where: { id },
        });
    }
};
exports.VehiclesService = VehiclesService;
exports.VehiclesService = VehiclesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VehiclesService);
//# sourceMappingURL=vehicles.service.js.map