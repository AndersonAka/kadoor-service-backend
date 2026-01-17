export declare enum ApartmentType {
    TYPE_1 = "TYPE_1",
    TYPE_2 = "TYPE_2",
    TYPE_3 = "TYPE_3"
}
export declare class QueryApartmentsDto {
    type?: ApartmentType;
    city?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    search?: string;
    page?: number;
    limit?: number;
}
