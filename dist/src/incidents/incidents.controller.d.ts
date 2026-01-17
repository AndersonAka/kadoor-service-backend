import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
export declare class IncidentsController {
    private readonly incidentsService;
    constructor(incidentsService: IncidentsService);
    createIncident(dto: CreateIncidentDto, req: any): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        } | null;
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
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        type: import("@prisma/client").$Enums.IncidentType;
        location: string | null;
        images: string[];
        status: import("@prisma/client").$Enums.IncidentStatus;
        userId: string | null;
        vehicleId: string | null;
        apartmentId: string | null;
        date: Date | null;
    }>;
    findAll(userId?: string, status?: string, req?: any): Promise<({
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        } | null;
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
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        type: import("@prisma/client").$Enums.IncidentType;
        location: string | null;
        images: string[];
        status: import("@prisma/client").$Enums.IncidentStatus;
        userId: string | null;
        vehicleId: string | null;
        apartmentId: string | null;
        date: Date | null;
    })[]>;
    findOne(id: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        } | null;
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
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        type: import("@prisma/client").$Enums.IncidentType;
        location: string | null;
        images: string[];
        status: import("@prisma/client").$Enums.IncidentStatus;
        userId: string | null;
        vehicleId: string | null;
        apartmentId: string | null;
        date: Date | null;
    }>;
    updateStatus(id: string, status: string): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        type: import("@prisma/client").$Enums.IncidentType;
        location: string | null;
        images: string[];
        status: import("@prisma/client").$Enums.IncidentStatus;
        userId: string | null;
        vehicleId: string | null;
        apartmentId: string | null;
        date: Date | null;
    }>;
}
