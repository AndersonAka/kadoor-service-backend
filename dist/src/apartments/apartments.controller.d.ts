import { ApartmentsService } from './apartments.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { QueryApartmentsDto } from './dto/query-apartments.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
export declare class ApartmentsController {
    private readonly apartmentsService;
    constructor(apartmentsService: ApartmentsService);
    create(createApartmentDto: CreateApartmentDto): import("@prisma/client").Prisma.Prisma__ApartmentClient<{
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
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
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
    checkAvailability(id: string, checkAvailabilityDto: CheckAvailabilityDto): Promise<{
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
    update(id: string, updateApartmentDto: UpdateApartmentDto): import("@prisma/client").Prisma.Prisma__ApartmentClient<{
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
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    remove(id: string): import("@prisma/client").Prisma.Prisma__ApartmentClient<{
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
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}
