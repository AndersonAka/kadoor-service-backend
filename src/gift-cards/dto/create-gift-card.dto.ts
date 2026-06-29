import { IsNumber, IsOptional, IsString, IsEmail, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGiftCardDto {
  @ApiProperty({ description: 'Montant de la carte en FCFA', minimum: 1000 })
  @IsNumber()
  @Min(1000)
  initialAmount: number;

  @ApiPropertyOptional() @IsOptional() @IsString() theme?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recipientName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() recipientEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recipientPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() senderMessage?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validUntil?: string;
}
