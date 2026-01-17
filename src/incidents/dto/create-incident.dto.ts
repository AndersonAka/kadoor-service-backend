import { IsNotEmpty, IsString, IsEnum, IsOptional, IsEmail, IsArray, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum IncidentType {
  ACCIDENT = 'ACCIDENT',
  PANNE = 'PANNE',
  SINISTRE = 'SINISTRE',
  VOL = 'VOL',
  DOMMAGE = 'DOMMAGE',
  AUTRES = 'AUTRES',
}

export class CreateIncidentDto {
  @ApiProperty({ enum: IncidentType, description: 'Type d\'incident' })
  @IsNotEmpty()
  @IsEnum(IncidentType)
  type: IncidentType;

  @ApiProperty({ description: 'Titre de l\'incident' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description détaillée de l\'incident' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Lieu de l\'incident', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Date de l\'incident (ISO string)', required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ description: 'Prénom' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Nom' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Email' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Numéro de téléphone', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'ID du véhicule concerné', required: false })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiProperty({ description: 'ID de l\'appartement concerné', required: false })
  @IsOptional()
  @IsString()
  apartmentId?: string;

  @ApiProperty({ description: 'URLs des images', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
