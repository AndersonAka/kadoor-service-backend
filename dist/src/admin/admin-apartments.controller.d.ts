import { ApartmentsService } from '../apartments/apartments.service';
import { CreateApartmentDto } from '../apartments/dto/create-apartment.dto';
import { UpdateApartmentDto } from '../apartments/dto/update-apartment.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
export declare class AdminApartmentsController {
    private readonly apartmentsService;
    constructor(apartmentsService: ApartmentsService);
    findAll(query: AdminQueryDto): Promise<{
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
    uploadImages(id: string, files: Express.Multer.File[]): Promise<{
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
}
