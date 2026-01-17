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
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReviewsService = class ReviewsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createReviewDto) {
        if (createReviewDto.vehicleId) {
            const vehicle = await this.prisma.vehicle.findUnique({
                where: { id: createReviewDto.vehicleId },
            });
            if (!vehicle) {
                throw new common_1.NotFoundException('Vehicle not found');
            }
        }
        if (createReviewDto.apartmentId) {
            const apartment = await this.prisma.apartment.findUnique({
                where: { id: createReviewDto.apartmentId },
            });
            if (!apartment) {
                throw new common_1.NotFoundException('Apartment not found');
            }
        }
        return this.prisma.review.create({
            data: createReviewDto,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }
    async findByVehicle(vehicleId) {
        return this.prisma.review.findMany({
            where: { vehicleId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findByApartment(apartmentId) {
        return this.prisma.review.findMany({
            where: { apartmentId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getAverageRating(vehicleId, apartmentId) {
        const where = {};
        if (vehicleId)
            where.vehicleId = vehicleId;
        if (apartmentId)
            where.apartmentId = apartmentId;
        const reviews = await this.prisma.review.findMany({ where });
        if (reviews.length === 0)
            return { average: 0, count: 0 };
        const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
        return {
            average: Math.round((sum / reviews.length) * 10) / 10,
            count: reviews.length,
        };
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map