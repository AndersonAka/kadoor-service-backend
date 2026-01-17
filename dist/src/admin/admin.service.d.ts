import { PrismaService } from '../prisma/prisma.service';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    getDashboardStats(): Promise<{
        overview: {
            totalBookings: number;
            totalVehicles: number;
            totalApartments: number;
            totalUsers: number;
            totalRevenue: number;
            monthlyRevenue: number;
            last30DaysRevenue: number;
        };
        bookings: {
            confirmed: number;
            pending: number;
            cancelled: number;
            completed: number;
            byType: {
                vehicles: number;
                apartments: number;
            };
        };
        recentBookings: ({
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
            };
            vehicle: {
                id: string;
                title: string;
            } | null;
            apartment: {
                id: string;
                title: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            startDate: Date;
            endDate: Date;
            totalPrice: number;
            status: string;
            userId: string;
            vehicleId: string | null;
            apartmentId: string | null;
        })[];
        monthlyRevenues: {
            month: string;
            revenue: number;
            date: Date;
        }[];
        topVehicles: {
            id: string;
            title: string;
            type: string;
            bookingsCount: number;
            pricePerDay: number;
        }[];
        topApartments: {
            id: string;
            title: string;
            type: string | null;
            city: string;
            bookingsCount: number;
            pricePerNight: number;
        }[];
    }>;
    private getMonthlyRevenues;
    private getTopVehicles;
    private getTopApartments;
    getChartData(period?: 'day' | 'week' | 'month' | 'year'): Promise<{
        period: "year" | "week" | "day" | "month";
        data: {
            revenue: number;
            count: number;
            label: string;
        }[];
    }>;
    private groupBookingsByInterval;
    private getIntervalKey;
    private incrementDate;
}
