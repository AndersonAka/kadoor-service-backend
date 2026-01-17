import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// ReviewsController est le contrôleur qui gère les requêtes HTTP pour les reviews
// Il permet de créer, de lire, de mettre à jour et de supprimer les reviews
// Il permet également de calculer la moyenne des notes des véhicules et des appartements
// Il permet également de calculer le nombre de reviews des véhicules et des appartements
// Il permet également de calculer le nombre de reviews des véhicules et des appartements

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un commentaire' })
  @ApiResponse({ status: 201, description: 'Commentaire créé avec succès' })
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(createReviewDto);
  }

  // Récupérer les commentaires d'un véhicule
  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Récupérer les commentaires d\'un véhicule' })
  @ApiParam({ name: 'vehicleId', description: 'ID du véhicule' })
  @ApiResponse({ status: 200, description: 'Liste des commentaires récupérée avec succès' })
  findByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.reviewsService.findByVehicle(vehicleId);
  }

  // Récupérer les commentaires d'un appartement
  @Get('apartment/:apartmentId')
  @ApiOperation({ summary: 'Récupérer les commentaires d\'un appartement' })
  @ApiParam({ name: 'apartmentId', description: 'ID de l\'appartement' })
  @ApiResponse({ status: 200, description: 'Liste des commentaires récupérée avec succès' })
  findByApartment(@Param('apartmentId') apartmentId: string) {
    return this.reviewsService.findByApartment(apartmentId);
  }

  // Récupérer la note moyenne d'un véhicule
  @Get('rating/vehicle/:vehicleId')
  @ApiOperation({ summary: 'Récupérer la note moyenne d\'un véhicule' })
  @ApiParam({ name: 'vehicleId', description: 'ID du véhicule' })
  @ApiResponse({ status: 200, description: 'Note moyenne récupérée avec succès' })
  getVehicleRating(@Param('vehicleId') vehicleId: string) {
    return this.reviewsService.getAverageRating(vehicleId);
  }

  // Récupérer la note moyenne d'un appartement
  @Get('rating/apartment/:apartmentId')
  @ApiOperation({ summary: 'Récupérer la note moyenne d\'un appartement' })
  @ApiParam({ name: 'apartmentId', description: 'ID de l\'appartement' })
  @ApiResponse({ status: 200, description: 'Note moyenne récupérée avec succès' })
  getApartmentRating(@Param('apartmentId') apartmentId: string) {
    return this.reviewsService.getAverageRating(undefined, apartmentId);
  }
}
