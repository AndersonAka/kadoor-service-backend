export declare class CreateVehicleDto {
    title: string;
    description: string;
    type: string;
    make?: string;
    model?: string;
    year?: number;
    fuel?: string;
    transmission?: string;
    seats?: number;
    location?: string;
    pricePerDay: number;
    isAvailable?: boolean;
    images?: string[];
    features?: string[];
}
