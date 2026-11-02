import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ApplyListingDto {
  @IsIn(['vehicle', 'apartment'])
  kind: 'vehicle' | 'apartment';

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerNight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @IsArray()
  @ArrayMinSize(9)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  images: string[];
}

/** Inscription publique. Pas de mot de passe : le compte est créé à la validation. */
export class ApplyPartnerDto {
  @IsIn(['PHYSICAL', 'COMPANY'])
  partnerType: 'PHYSICAL' | 'COMPANY';

  @IsIn(['AUTO', 'APARTMENT', 'BOTH'])
  category: 'AUTO' | 'APARTMENT' | 'BOTH';

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  registrationDate?: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  phone2?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  vehicleCount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vehicleTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  autoCompliance?: string[];

  @IsOptional()
  @IsString()
  geoZones?: string;

  @IsOptional()
  @IsString()
  pickupPoints?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitCount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  housingTypes?: string[];

  @IsOptional()
  @IsString()
  housingTypeOther?: string;

  @IsOptional()
  @IsString()
  mainCities?: string;

  @ValidateNested()
  @Type(() => ApplyListingDto)
  listing: ApplyListingDto;
}
