export declare class CreateReservationVehicleDto {
    vehicleId: string;
    startDate: string;
    endDate: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    additionalDrivers?: number;
    specialRequests?: string;
}
