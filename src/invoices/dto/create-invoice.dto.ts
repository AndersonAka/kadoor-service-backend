import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export const DEPOSIT_PAYMENT_METHODS = [
  'CASH',
  'BANK_TRANSFER',
  'CARD',
  'CHECK',
  'OTHER',
] as const;
export type DepositPaymentMethod = (typeof DEPOSIT_PAYMENT_METHODS)[number];

export class CreateInvoiceLineDto {
  @IsEnum(['DAMAGE', 'LATE_RETURN', 'MILEAGE_OVERAGE', 'TRAFFIC_FINE', 'CLEANING', 'OTHER'])
  category: 'DAMAGE' | 'LATE_RETURN' | 'MILEAGE_OVERAGE' | 'TRAFFIC_FINE' | 'CLEANING' | 'OTHER';

  @IsString()
  @IsNotEmpty()
  description: string;

  @Type(() => Number)
  @IsNumber()
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  unitPrice: number;
}

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxAmount?: number;

  @IsOptional()
  @IsString()
  internalNote?: string;

  @IsOptional()
  @IsString()
  customerNote?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines: CreateInvoiceLineDto[];

  /** Si true, une caution a été versée — depositAmount devient requis */
  @IsOptional()
  @IsBoolean()
  depositEnabled?: boolean;

  @ValidateIf((o) => o.depositEnabled === true)
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  depositAmount?: number;

  @IsOptional()
  @IsIn(DEPOSIT_PAYMENT_METHODS)
  depositPaymentMethod?: DepositPaymentMethod;

  @IsOptional()
  @IsDateString()
  depositCollectedAt?: string;

  @IsOptional()
  @IsString()
  depositNote?: string;
}
