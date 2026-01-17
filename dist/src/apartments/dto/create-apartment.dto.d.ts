export declare class CreateApartmentDto {
    title: string;
    description: string;
    type?: string;
    address: string;
    city: string;
    pricePerNight: number;
    bedrooms: number;
    bathrooms: number;
    area: number;
    images?: string[];
    features?: string[];
    isAvailable?: boolean;
}
