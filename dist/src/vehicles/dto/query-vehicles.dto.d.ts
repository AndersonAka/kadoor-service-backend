export declare enum VehicleType {
    TYPE_1 = "TYPE_1",
    TYPE_2 = "TYPE_2",
    TYPE_3 = "TYPE_3",
    TYPE_4 = "TYPE_4"
}
export declare class QueryVehiclesDto {
    type?: VehicleType;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    page?: number;
    limit?: number;
}
