import { IsString, IsNumber, IsBoolean, IsArray, IsOptional, IsInt } from 'class-validator';

export class CreateApartmentDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsNumber()
  pricePerNight: number;

  @IsOptional()
  @IsNumber()
  cleaningFee?: number;

  @IsInt()
  bedrooms: number;

  @IsInt()
  bathrooms: number;

  @IsNumber()
  area: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  /** Partenaire loueur propriétaire du logement — omis/null = géré directement par Kadoor Service */
  @IsOptional()
  @IsString()
  partnerId?: string;
}
