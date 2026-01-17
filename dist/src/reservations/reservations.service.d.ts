import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationVehicleDto } from './dto/create-reservation-vehicle.dto';
import { CreateReservationApartmentDto } from './dto/create-reservation-apartment.dto';
import { VehiclesService } from '../vehicles/vehicles.service';
import { ApartmentsService } from '../apartments/apartments.service';
import { EmailService } from '../email/email.service';
export declare class ReservationsService {
    private prisma;
    private vehiclesService;
    private apartmentsService;
    private emailService;
    constructor(prisma: PrismaService, vehiclesService: VehiclesService, apartmentsService: ApartmentsService, emailService: EmailService);
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
    }>;
    updateStatus(id: string, status: string): Promise<{
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
    }>;
    cancel(id: string): Promise<{
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
    }>;
}
