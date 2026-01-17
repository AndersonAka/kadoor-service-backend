import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum VehicleType {
  TYPE_1 = 'TYPE_1',
  TYPE_2 = 'TYPE_2',
  TYPE_3 = 'TYPE_3',
  TYPE_4 = 'TYPE_4',
}

export class QueryVehiclesDto {
  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
