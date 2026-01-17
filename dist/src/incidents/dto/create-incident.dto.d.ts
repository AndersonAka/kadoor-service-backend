export declare enum IncidentType {
    ACCIDENT = "ACCIDENT",
    PANNE = "PANNE",
    SINISTRE = "SINISTRE",
    VOL = "VOL",
    DOMMAGE = "DOMMAGE",
    AUTRES = "AUTRES"
}
export declare class CreateIncidentDto {
    type: IncidentType;
    title: string;
    description: string;
    location?: string;
    date?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    vehicleId?: string;
    apartmentId?: string;
    images?: string[];
}
