import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class VehiclesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createVehicleDto: CreateVehicleDto): Prisma.Prisma__VehicleClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        type: string;
        make: string | null;
        model: string | null;
        year: number | null;
        fuel: string | null;
        transmission: string | null;
        seats: number | null;
        location: string | null;
        pricePerDay: number;
        isAvailable: boolean;
        images: string[];
        features: string[];
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    findAll(query: QueryVehiclesDto): Promise<{
        data: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            type: string;
            make: string | null;
            model: string | null;
            year: number | null;
            fuel: string | null;
            transmission: string | null;
            seats: number | null;
            location: string | null;
            pricePerDay: number;
            isAvailable: boolean;
            images: string[];
            features: string[];
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
        type: string;
        make: string | null;
        model: string | null;
        year: number | null;
        fuel: string | null;
        transmission: string | null;
        seats: number | null;
        location: string | null;
        pricePerDay: number;
        isAvailable: boolean;
        images: string[];
        features: string[];
    }>;
    checkAvailability(id: string, startDate: string, endDate: string): Promise<{
        available: boolean;
        reason: string;
        bookedDates: never[];
        vehicleId?: undefined;
        startDate?: undefined;
        endDate?: undefined;
    } | {
        available: boolean;
        vehicleId: string;
        startDate: string;
        endDate: string;
        bookedDates: string[];
        reason?: undefined;
    }>;
    update(id: string, updateVehicleDto: UpdateVehicleDto): Prisma.Prisma__VehicleClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        type: string;
        make: string | null;
        model: string | null;
        year: number | null;
        fuel: string | null;
        transmission: string | null;
        seats: number | null;
        location: string | null;
        pricePerDay: number;
        isAvailable: boolean;
        images: string[];
        features: string[];
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
    remove(id: string): Prisma.Prisma__VehicleClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        type: string;
        make: string | null;
        model: string | null;
        year: number | null;
        fuel: string | null;
        transmission: string | null;
        seats: number | null;
        location: string | null;
        pricePerDay: number;
        isAvailable: boolean;
        images: string[];
        features: string[];
    }, never, import("@prisma/client/runtime/client").DefaultArgs, Prisma.PrismaClientOptions>;
}
