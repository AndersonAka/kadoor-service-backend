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
exports.ApartmentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ApartmentsService = class ApartmentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(createApartmentDto) {
        return this.prisma.apartment.create({
            data: createApartmentDto,
        });
    }
    async findAll(query) {
        const { type, city, minPrice, maxPrice, bedrooms, search, page = 1, limit = 10, } = query;
        const where = {
            isAvailable: true,
        };
        if (type) {
            where.type = type;
        }
        if (city) {
            where.city = {
                contains: city,
                mode: 'insensitive',
            };
        }
        if (minPrice !== undefined || maxPrice !== undefined) {
            where.pricePerNight = {};
            if (minPrice !== undefined) {
                where.pricePerNight.gte = minPrice;
            }
            if (maxPrice !== undefined) {
                where.pricePerNight.lte = maxPrice;
            }
        }
        if (bedrooms !== undefined) {
            where.bedrooms = bedrooms;
        }
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
            ];
        }
        const skip = (page - 1) * limit;
        const [apartments, total] = await Promise.all([
            this.prisma.apartment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.apartment.count({ where }),
        ]);
        return {
            data: apartments,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const apartment = await this.prisma.apartment.findUnique({
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
        if (!apartment) {
            throw new common_1.NotFoundException(`Appartement avec l'ID ${id} non trouvé`);
        }
        return apartment;
    }
    async checkAvailability(id, startDate, endDate) {
        const apartment = await this.findOne(id);
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
                apartmentId: id,
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
        const available = !conflictingBookings && apartment.isAvailable;
        return {
            available,
            apartmentId: id,
            startDate,
            endDate,
            conflictingBooking: conflictingBookings || null,
        };
    }
    update(id, updateApartmentDto) {
        return this.prisma.apartment.update({
            where: { id },
            data: updateApartmentDto,
        });
    }
    remove(id) {
        return this.prisma.apartment.delete({
            where: { id },
        });
    }
};
exports.ApartmentsService = ApartmentsService;
exports.ApartmentsService = ApartmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ApartmentsService);
//# sourceMappingURL=apartments.service.js.map