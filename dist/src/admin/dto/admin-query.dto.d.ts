export declare enum BookingStatus {
    PENDING = "PENDING",
    CONFIRMED = "CONFIRMED",
    CANCELLED = "CANCELLED",
    COMPLETED = "COMPLETED"
}
export declare class AdminQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
    status?: BookingStatus;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
