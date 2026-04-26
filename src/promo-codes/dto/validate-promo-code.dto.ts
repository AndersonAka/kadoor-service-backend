import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ValidatePromoCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsIn(['VEHICLE', 'APARTMENT'])
  itemType?: 'VEHICLE' | 'APARTMENT';
}
