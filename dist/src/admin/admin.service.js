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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AdminService = class AdminService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardStats() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalBookings, totalVehicles, totalApartments, totalUsers, confirmedBookings, pendingBookings, cancelledBookings, completedBookings,] = await Promise.all([
            this.prisma.booking.count(),
            this.prisma.vehicle.count(),
            this.prisma.apartment.count(),
            this.prisma.user.count(),
            this.prisma.booking.count({ where: { status: 'CONFIRMED' } }),
            this.prisma.booking.count({ where: { status: 'PENDING' } }),
            this.prisma.booking.count({ where: { status: 'CANCELLED' } }),
            this.prisma.booking.count({ where: { status: 'COMPLETED' } }),
        ]);
        const totalRevenue = await this.prisma.booking.aggregate({
            where: {
                status: {
                    in: ['CONFIRMED', 'COMPLETED'],
                },
            },
            _sum: {
                totalPrice: true,
            },
        });
        const monthlyRevenue = await this.prisma.booking.aggregate({
            where: {
                status: {
                    in: ['CONFIRMED', 'COMPLETED'],
                },
                createdAt: {
                    gte: startOfMonth,
                },
            },
            _sum: {
                totalPrice: true,
            },
        });
        const last30DaysRevenue = await this.prisma.booking.aggregate({
            where: {
                status: {
                    in: ['CONFIRMED', 'COMPLETED'],
                },
                createdAt: {
                    gte: last30Days,
                },
            },
            _sum: {
                totalPrice: true,
            },
        });
        const recentBookings = await this.prisma.booking.findMany({
            where: {
                createdAt: {
                    gte: last30Days,
                },
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
            orderBy: {
                createdAt: 'desc',
            },
            take: 10,
        });
        const vehicleBookings = await this.prisma.booking.count({
            where: {
                vehicleId: {
                    not: null,
                },
            },
        });
        const apartmentBookings = await this.prisma.booking.count({
            where: {
                apartmentId: {
                    not: null,
                },
            },
        });
        const monthlyRevenues = await this.getMonthlyRevenues(12);
        const topVehicles = await this.getTopVehicles(5);
        const topApartments = await this.getTopApartments(5);
        return {
            overview: {
                totalBookings,
                totalVehicles,
                totalApartments,
                totalUsers,
                totalRevenue: totalRevenue._sum.totalPrice || 0,
                monthlyRevenue: monthlyRevenue._sum.totalPrice || 0,
                last30DaysRevenue: last30DaysRevenue._sum.totalPrice || 0,
            },
            bookings: {
                confirmed: confirmedBookings,
                pending: pendingBookings,
                cancelled: cancelledBookings,
                completed: completedBookings,
                byType: {
                    vehicles: vehicleBookings,
                    apartments: apartmentBookings,
                },
            },
            recentBookings,
            monthlyRevenues,
            topVehicles,
            topApartments,
        };
    }
    async getMonthlyRevenues(months) {
        const revenues = [];
        const now = new Date();
        for (let i = months - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const revenue = await this.prisma.booking.aggregate({
                where: {
                    status: {
                        in: ['CONFIRMED', 'COMPLETED'],
                    },
                    createdAt: {
                        gte: monthStart,
                        lte: monthEnd,
                    },
                },
                _sum: {
                    totalPrice: true,
                },
            });
            revenues.push({
                month: monthStart.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
                revenue: revenue._sum.totalPrice || 0,
                date: monthStart,
            });
        }
        return revenues;
    }
    async getTopVehicles(limit) {
        const vehicles = await this.prisma.vehicle.findMany({
            include: {
                _count: {
                    select: {
                        bookings: {
                            where: {
                                status: {
                                    in: ['CONFIRMED', 'COMPLETED'],
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                bookings: {
                    _count: 'desc',
                },
            },
            take: limit,
        });
        return vehicles.map((vehicle) => ({
            id: vehicle.id,
            title: vehicle.title,
            type: vehicle.type,
            bookingsCount: vehicle._count.bookings,
            pricePerDay: vehicle.pricePerDay,
        }));
    }
    async getTopApartments(limit) {
        const apartments = await this.prisma.apartment.findMany({
            include: {
                _count: {
                    select: {
                        bookings: {
                            where: {
                                status: {
                                    in: ['CONFIRMED', 'COMPLETED'],
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                bookings: {
                    _count: 'desc',
                },
            },
            take: limit,
        });
        return apartments.map((apartment) => ({
            id: apartment.id,
            title: apartment.title,
            type: apartment.type,
            city: apartment.city,
            bookingsCount: apartment._count.bookings,
            pricePerNight: apartment.pricePerNight,
        }));
    }
    async getChartData(period = 'month') {
        const now = new Date();
        let startDate;
        let interval;
        switch (period) {
            case 'day':
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                interval = 'day';
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                interval = 'day';
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                interval = 'day';
                break;
            case 'year':
                startDate = new Date(now.getFullYear() - 1, 0, 1);
                interval = 'month';
                break;
        }
        const bookings = await this.prisma.booking.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                },
                status: {
                    in: ['CONFIRMED', 'COMPLETED'],
                },
            },
            select: {
                createdAt: true,
                totalPrice: true,
                status: true,
            },
        });
        const grouped = this.groupBookingsByInterval(bookings, startDate, now, interval, period);
        return {
            period,
            data: grouped,
        };
    }
    groupBookingsByInterval(bookings, startDate, endDate, interval, period) {
        const groups = {};
        const current = new Date(startDate);
        if (period === 'day') {
            const now = new Date();
            for (let i = 23; i >= 0; i--) {
                const hourDate = new Date(now.getTime() - i * 60 * 60 * 1000);
                hourDate.setMinutes(0, 0, 0);
                const key = hourDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                groups[key] = { revenue: 0, count: 0 };
            }
        }
        else {
            while (current <= endDate) {
                const key = this.getIntervalKey(current, interval);
                groups[key] = { revenue: 0, count: 0 };
                this.incrementDate(current, interval);
            }
        }
        bookings.forEach((booking) => {
            let key;
            if (period === 'day') {
                const bookingDate = new Date(booking.createdAt);
                bookingDate.setMinutes(0, 0, 0);
                key = bookingDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            }
            else {
                key = this.getIntervalKey(booking.createdAt, interval);
            }
            if (groups[key]) {
                groups[key].revenue += booking.totalPrice;
                groups[key].count += 1;
            }
        });
        return Object.entries(groups).map(([label, data]) => ({
            label,
            ...data,
        }));
    }
    getIntervalKey(date, interval) {
        switch (interval) {
            case 'day':
                return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
            case 'month':
                return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
            case 'year':
                return date.getFullYear().toString();
        }
    }
    incrementDate(date, interval) {
        switch (interval) {
            case 'day':
                date.setDate(date.getDate() + 1);
                break;
            case 'month':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'year':
                date.setFullYear(date.getFullYear() + 1);
                break;
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map