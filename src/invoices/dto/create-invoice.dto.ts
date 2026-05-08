import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

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
}
