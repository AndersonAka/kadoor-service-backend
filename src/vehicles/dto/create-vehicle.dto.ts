import { IsString, IsNumber, IsBoolean, IsArray, IsOptional } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  fuel?: string;

  @IsOptional()
  @IsString()
  transmission?: string;

  @IsOptional()
  @IsNumber()
  seats?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsNumber()
  pricePerDay: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}
