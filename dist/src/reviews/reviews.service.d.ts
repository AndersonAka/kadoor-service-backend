import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
export declare class ReviewsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createReviewDto: CreateReviewDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        vehicleId: string | null;
        apartmentId: string | null;
        rating: number;
        comment: string;
    }>;
    findByVehicle(vehicleId: string): Promise<({
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        vehicleId: string | null;
        apartmentId: string | null;
        rating: number;
        comment: string;
    })[]>;
    findByApartment(apartmentId: string): Promise<({
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        vehicleId: string | null;
        apartmentId: string | null;
        rating: number;
        comment: string;
    })[]>;
    getAverageRating(vehicleId?: string, apartmentId?: string): Promise<{
        average: number;
        count: number;
    }>;
}
