import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, Max, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GiftCardBatchBuyerType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
}

export class CreateGiftCardBatchDto {
  @ApiProperty({ enum: GiftCardBatchBuyerType, description: 'Type d\'acheteur' })
  @IsEnum(GiftCardBatchBuyerType)
  buyerType: GiftCardBatchBuyerType;

  @ApiPropertyOptional({ description: 'Raison sociale — requis si buyerType = COMPANY' })
  @ValidateIf((o) => o.buyerType === GiftCardBatchBuyerType.COMPANY)
  @IsString()
  companyName?: string;

  @ApiProperty({ description: 'Nombre de cartes du lot', minimum: 5, maximum: 50 })
  @IsInt()
  @Min(5)
  @Max(50)
  quantity: number;

  @ApiProperty({ description: 'Montant unitaire par carte en FCFA', minimum: 20000, maximum: 250000 })
  @IsNumber()
  @Min(20000)
  @Max(250000)
  unitAmount: number;
}
