import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
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
    getVehicleRating(vehicleId: string): Promise<{
        average: number;
        count: number;
    }>;
    getApartmentRating(apartmentId: string): Promise<{
        average: number;
        count: number;
    }>;
}
