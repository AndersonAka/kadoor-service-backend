import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { QueryApartmentsDto } from './dto/query-apartments.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class ApartmentsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createApartmentDto: CreateApartmentDto): Prisma.Prisma__ApartmentClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        type: string | null;
        isAvailable: boolean;
        images: string[];
        features: string[];
        address: string;
        city: string;
        pricePerNight: number;
        bedrooms: number;
        bathrooms: number;
        area: number;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    findAll(query: QueryApartmentsDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            type: string | null;
            isAvailable: boolean;
            images: string[];
            features: string[];
            address: string;
            city: string;
            pricePerNight: number;
            bedrooms: number;
            bathrooms: number;
            area: number;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
        bookings: {
            startDate: Date;
            endDate: Date;
            status: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        type: string | null;
        isAvailable: boolean;
        images: string[];
        features: string[];
        address: string;
        city: string;
        pricePerNight: number;
        bedrooms: number;
        bathrooms: number;
        area: number;
    }>;
    checkAvailability(id: string, startDate: string, endDate: string): Promise<{
        available: boolean;
        reason: string;
        apartmentId?: undefined;
        startDate?: undefined;
        endDate?: undefined;
        conflictingBooking?: undefined;
    } | {
        available: boolean;
        apartmentId: string;
        startDate: string;
        endDate: string;
        conflictingBooking: {
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
        } | null;
        reason?: undefined;
    }>;
    update(id: string, updateApartmentDto: UpdateApartmentDto): Prisma.Prisma__ApartmentClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        type: string | null;
        isAvailable: boolean;
        images: string[];
        features: string[];
        address: string;
        city: string;
        pricePerNight: number;
        bedrooms: number;
        bathrooms: number;
        area: number;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    remove(id: string): Prisma.Prisma__ApartmentClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        type: string | null;
        isAvailable: boolean;
        images: string[];
        features: string[];
        address: string;
        city: string;
        pricePerNight: number;
        bedrooms: number;
        bathrooms: number;
        area: number;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
}
