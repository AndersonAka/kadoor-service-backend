import { IsOptional, IsString, IsNumber, IsEnum, Min, Max, IsDateString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ListingStatus } from '@prisma/client';

export enum ApartmentType {
  TYPE_1 = 'TYPE_1',
  TYPE_2 = 'TYPE_2',
  TYPE_3 = 'TYPE_3',
}

export class QueryApartmentsDto {
  @IsOptional()
  @IsEnum(ApartmentType)
  type?: ApartmentType;

  @IsOptional()
  @IsString()
  city?: string;

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
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bedrooms?: number;

  @IsOptional()
  @IsString()
  search?: string;

  /** Disponibilité : période demandée (ISO 8601). Si les deux sont fournies et valides,
   *  les appartements dont un Booking chevauche la période sont exclus. */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  /** Nombre de voyageurs → heuristique `bedrooms >= ceil(guests / 2)` (1 chambre ≈ 2 pers.). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  guests?: number;

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

  /** Admin : inclure les appartements indisponibles */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  includeUnavailable?: boolean;

  /** Admin : filtrer par statut de modération (PENDING/APPROVED/REJECTED) */
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  /** Admin : voir tous les statuts (par défaut, seuls les appartements APPROVED sont publics) */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  includeAllStatuses?: boolean;
}
