import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PartnerTypeDto {
  PHYSICAL = 'PHYSICAL',
  COMPANY = 'COMPANY',
  FREELANCE = 'FREELANCE',
}

export enum PartnerCategoryDto {
  AUTO = 'AUTO',
  APARTMENT = 'APARTMENT',
  BOTH = 'BOTH',
}

export class BeneficiaryDto {
  @IsString() name: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsNumber() ownershipPct?: number;
  @IsOptional() @IsString() birthDate?: string;
  @IsOptional() @IsString() idNumber?: string;
}

export class CreatePartnerDto {
  @ApiProperty({ enum: PartnerTypeDto })
  @IsEnum(PartnerTypeDto)
  partnerType: PartnerTypeDto;

  @ApiProperty({ enum: PartnerCategoryDto })
  @IsEnum(PartnerCategoryDto)
  category: PartnerCategoryDto;

  // §1A — Personne physique
  @ApiPropertyOptional() @IsOptional() @IsString() fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() birthPlace?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() idType?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() idExpiry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;

  // §1B — Personne morale
  @ApiPropertyOptional() @IsOptional() @IsString() legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() registrationNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() registrationDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() legalForm?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() incorporationCountry?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessSector?: string;

  // §1C — Coordonnées
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone2?: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;

  // §2 — Bénéficiaires
  @ApiPropertyOptional({ type: [BeneficiaryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BeneficiaryDto)
  beneficiaries?: BeneficiaryDto[];

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPPE?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() ppeDetails?: string;

  // §3 — Financier
  @ApiPropertyOptional() @IsOptional() @IsArray() fundSources?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() fundSourceOther?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedAnnualRevenue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() estimatedMonthlyTx?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() avgTransactionValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() maxTransactionValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() bank1Name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bank1Country?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bank2Name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bank2Country?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() otherPlatforms?: string[];

  // §4 — Auto
  @ApiPropertyOptional() @IsOptional() @IsNumber() vehicleCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() vehicleTypes?: string[];
  @ApiPropertyOptional() @IsOptional() @IsNumber() fleetTotalValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fleetRenewalYear?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() autoCompliance?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() geoZones?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pickupPoints?: string;

  // §5 — Appartement
  @ApiPropertyOptional() @IsOptional() @IsNumber() unitCount?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() housingTypes?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() mainCities?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() avgMonthlyRent?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() realEstateCompliance?: string[];
  @ApiPropertyOptional() @IsOptional() @IsArray() includedServices?: string[];

  // Création compte MERCHANT
  @ApiPropertyOptional() @IsOptional() @IsString() merchantPassword?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() merchantFirstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() merchantLastName?: string;
}
