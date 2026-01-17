import { PrismaService } from '../prisma/prisma.service';
import { AdminQueryDto } from './dto/admin-query.dto';
export declare class AdminClientsController {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(query: AdminQueryDto): Promise<{
        data: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
            role: import("@prisma/client").$Enums.Role;
            createdAt: Date;
            _count: {
                bookings: number;
            };
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
        stats: {
            totalSpent: number;
            bookingsCount: number;
            completedBookings: number;
            averageRating: number;
        };
        bookings: ({
            vehicle: {
                id: string;
                title: string;
                type: string;
            } | null;
            apartment: {
                id: string;
                title: string;
                type: string | null;
                city: string;
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
        reviews: ({
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
            userId: string;
            vehicleId: string | null;
            apartmentId: string | null;
            rating: number;
            comment: string;
        })[];
        id: string;
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        googleId: string | null;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getClientBookings(id: string, query: AdminQueryDto): Promise<{
        data: ({
            vehicle: {
                id: string;
                title: string;
                type: string;
            } | null;
            apartment: {
                id: string;
                title: string;
                type: string | null;
                city: string;
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
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
