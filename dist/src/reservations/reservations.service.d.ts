import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationVehicleDto } from './dto/create-reservation-vehicle.dto';
import { CreateReservationApartmentDto } from './dto/create-reservation-apartment.dto';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ApartmentsService } from '../apartments/apartments.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaystackService } from './paystack.service';
export declare class ReservationsService {
    private prisma;
    private vehiclesService;
    private apartmentsService;
    private emailService;
    private notificationsService;
    private paystackService;
    private configService;
    constructor(prisma: PrismaService, vehiclesService: VehiclesService, apartmentsService: ApartmentsService, emailService: EmailService, notificationsService: NotificationsService, paystackService: PaystackService, configService: ConfigService);
    private calculateDays;
    createVehicleReservation(userId: string, dto: CreateReservationVehicleDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
        };
        vehicle: {
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
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date;
        totalPrice: number;
        status: string;
        paystackReference: string | null;
        userId: string;
        vehicleId: string | null;
        apartmentId: string | null;
    }>;
    createApartmentReservation(userId: string, dto: CreateReservationApartmentDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
        };
        apartment: {
            id: string;
            address: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            type: string | null;
            isAvailable: boolean;
            images: string[];
            features: string[];
            city: string;
            pricePerNight: number;
            bedrooms: number;
            bathrooms: number;
            area: number;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date;
        totalPrice: number;
        status: string;
        paystackReference: string | null;
        userId: string;
        vehicleId: string | null;
        apartmentId: string | null;
    }>;
    findAll(userId?: string, status?: string): Promise<({
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
        };
        vehicle: {
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
        } | null;
        apartment: {
            id: string;
            address: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            type: string | null;
            isAvailable: boolean;
            images: string[];
            features: string[];
            city: string;
            pricePerNight: number;
            bedrooms: number;
            bathrooms: number;
            area: number;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date;
        totalPrice: number;
        status: string;
        paystackReference: string | null;
        userId: string;
        vehicleId: string | null;
        apartmentId: string | null;
    })[]>;
    findOne(id: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            phone: string | null;
        };
        vehicle: {
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
        } | null;
        apartment: {
            id: string;
            address: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            type: string | null;
            isAvailable: boolean;
            images: string[];
            features: string[];
            city: string;
            pricePerNight: number;
            bedrooms: number;
            bathrooms: number;
            area: number;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date;
        totalPrice: number;
        status: string;
        paystackReference: string | null;
        userId: string;
        vehicleId: string | null;
        apartmentId: string | null;
    }>;
    updateStatus(id: string, status: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
        vehicle: {
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
        } | null;
        apartment: {
            id: string;
            address: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            type: string | null;
            isAvailable: boolean;
            images: string[];
            features: string[];
            city: string;
            pricePerNight: number;
            bedrooms: number;
            bathrooms: number;
            area: number;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date;
        totalPrice: number;
        status: string;
        paystackReference: string | null;
        userId: string;
        vehicleId: string | null;
        apartmentId: string | null;
    }>;
    cancel(id: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
        vehicle: {
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
        } | null;
        apartment: {
            id: string;
            address: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            type: string | null;
            isAvailable: boolean;
            images: string[];
            features: string[];
            city: string;
            pricePerNight: number;
            bedrooms: number;
            bathrooms: number;
            area: number;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date;
        totalPrice: number;
        status: string;
        paystackReference: string | null;
        userId: string;
        vehicleId: string | null;
        apartmentId: string | null;
    }>;
    private buildCallbackUrl;
    initiateVehiclePayment(userId: string, userEmail: string, dto: CreateReservationVehicleDto): Promise<{
        booking: {
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
                phone: string | null;
            };
            vehicle: {
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
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            startDate: Date;
            endDate: Date;
            totalPrice: number;
            status: string;
            paystackReference: string | null;
            userId: string;
            vehicleId: string | null;
            apartmentId: string | null;
        };
        paymentUrl: string;
    }>;
    initiateApartmentPayment(userId: string, userEmail: string, dto: CreateReservationApartmentDto): Promise<{
        booking: {
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
                phone: string | null;
            };
            apartment: {
                id: string;
                address: string;
                createdAt: Date;
                updatedAt: Date;
                title: string;
                description: string;
                type: string | null;
                isAvailable: boolean;
                images: string[];
                features: string[];
                city: string;
                pricePerNight: number;
                bedrooms: number;
                bathrooms: number;
                area: number;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            startDate: Date;
            endDate: Date;
            totalPrice: number;
            status: string;
            paystackReference: string | null;
            userId: string;
            vehicleId: string | null;
            apartmentId: string | null;
        };
        paymentUrl: string;
    }>;
    verifyPayment(bookingId: string): Promise<{
        booking: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            startDate: Date;
            endDate: Date;
            totalPrice: number;
            status: string;
            paystackReference: string | null;
            userId: string;
            vehicleId: string | null;
            apartmentId: string | null;
        };
        status: string;
        message: string;
        paystackStatus?: undefined;
    } | {
        booking: {
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
                phone: string | null;
            };
            vehicle: {
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
            } | null;
            apartment: {
                id: string;
                address: string;
                createdAt: Date;
                updatedAt: Date;
                title: string;
                description: string;
                type: string | null;
                isAvailable: boolean;
                images: string[];
                features: string[];
                city: string;
                pricePerNight: number;
                bedrooms: number;
                bathrooms: number;
                area: number;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            startDate: Date;
            endDate: Date;
            totalPrice: number;
            status: string;
            paystackReference: string | null;
            userId: string;
            vehicleId: string | null;
            apartmentId: string | null;
        };
        status: string;
        paystackStatus: "success";
        message?: undefined;
    } | {
        booking: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            startDate: Date;
            endDate: Date;
            totalPrice: number;
            status: string;
            paystackReference: string | null;
            userId: string;
            vehicleId: string | null;
            apartmentId: string | null;
        };
        status: string;
        paystackStatus: "failed" | "abandoned";
        message?: undefined;
    } | {
        booking: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            startDate: Date;
            endDate: Date;
            totalPrice: number;
            status: string;
            paystackReference: string | null;
            userId: string;
            vehicleId: string | null;
            apartmentId: string | null;
        };
        status: string;
        paystackStatus: "pending";
        message?: undefined;
    }>;
    handleWebhook(signature: string, rawBody: string, body: any): Promise<{
        status: string;
        message: string;
    } | {
        status: string;
        message?: undefined;
    }>;
}
