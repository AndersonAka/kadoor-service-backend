import { IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertVehicleTypePricingDto {
  /** Forfait moins de 100 km/j — montant journalier (FCFA) */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tier1MileageDailyAmount: number;

  /** Forfait 100–200 km/j — montant journalier (FCFA) */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tier2MileageDailyAmount: number;

  /** Forfait 201–250 km/j — montant journalier (FCFA) */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tier3MileageDailyAmount: number;

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
