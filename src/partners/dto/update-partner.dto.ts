import { PartialType } from '@nestjs/mapped-types';
import { CreatePartnerDto } from './create-partner.dto';
import { IsEnum, IsOptional, IsNumber, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum PartnerStatusDto {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum RiskLevelDto {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class UpdatePartnerDto extends PartialType(CreatePartnerDto) {
  @ApiPropertyOptional({ enum: PartnerStatusDto })
  @IsOptional()
  @IsEnum(PartnerStatusDto)
  status?: PartnerStatusDto;

  // §7 — Évaluation des risques (usage interne)
  @ApiPropertyOptional() @IsOptional() @IsNumber() riskScoreCountry?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() riskScoreShareholders?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() riskScorePPE?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() riskScoreFunds?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() riskScoreVolume?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() riskScoreReputation?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() riskScoreCompliance?: number;
  @ApiPropertyOptional() @IsOptional() @IsEnum(RiskLevelDto) riskLevel?: RiskLevelDto;
  @ApiPropertyOptional() @IsOptional() @IsString() riskNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() riskMeasures?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() nextReviewAt?: string;

  // §8 — Signature / validation
  @ApiPropertyOptional() @IsOptional() @IsString() kycAnalyst?: string;
}
