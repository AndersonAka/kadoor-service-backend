import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/** Corps POST /promo-codes/generate : pas de code obligatoire (généré si absent), prefix optionnel. */
export class GeneratePromoCodeDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['PERCENT', 'FIXED'])
  discountType?: 'PERCENT' | 'FIXED';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000000)
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsIn(['ALL', 'VEHICLE', 'APARTMENT'])
  appliesTo?: 'ALL' | 'VEHICLE' | 'APARTMENT';
}
