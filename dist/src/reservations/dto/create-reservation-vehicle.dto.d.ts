export declare class CreateReservationVehicleDto {
    vehicleId: string;
    startDate: string;
    endDate: string;
    reservationType?: string;
    pickupTime?: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    additionalDrivers?: number;
    specialRequests?: string;
}
