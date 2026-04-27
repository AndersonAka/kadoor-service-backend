import { IsNumber, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertVehicleTypePricingDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePricePerDay: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  tier1KmPerDay: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tier1PricePerKm: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  tier2KmPerDay: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tier2PricePerKm: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  tier3KmPerDay: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tier3PricePerKm: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overagePricePerKm: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  insuranceAmount: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  insuranceDiscountPercent: number;
}
