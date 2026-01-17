import { IsInt, IsString, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
// CreateReviewDto est le DTO (Data Transfer Object) qui gère les données de création d'un review
// Il permet de valider les données de création d'un review
// Il permet de s'assurer que les données de création d'un review sont valides
// Il permet de s'assurer que les données de création d'un review sont correctes
// Il permet de s'assurer que les données de création d'un review sont complètes
// Il permet de s'assurer que les données de création d'un review sont correctes

export class CreateReviewDto {
  @ApiProperty({ description: 'Note de 1 à 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Commentaire' })
  @IsString()
  comment: string;

  @ApiProperty({ description: 'ID de l\'utilisateur', required: true })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'ID du véhicule (si commentaire sur un véhicule)', required: false })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @ApiProperty({ description: 'ID de l\'appartement (si commentaire sur un appartement)', required: false })
  @IsOptional()
  @IsUUID()
  apartmentId?: string;
}
