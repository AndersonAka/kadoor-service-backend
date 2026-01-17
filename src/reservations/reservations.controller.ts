import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationVehicleDto } from './dto/create-reservation-vehicle.dto';
import { CreateReservationApartmentDto } from './dto/create-reservation-apartment.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post('vehicles')
  @ApiOperation({ summary: 'Créer une réservation de véhicule' })
  @ApiResponse({ status: 201, description: 'Réservation créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({ status: 409, description: 'Véhicule non disponible pour cette période' })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  createVehicleReservation(
    @Body() dto: CreateReservationVehicleDto,
    @Request() req: any,
  ) {
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    const userId = req.user.userId;
    return this.reservationsService.createVehicleReservation(userId, dto);
  }

  @Post('apartments')
  @ApiOperation({ summary: 'Créer une réservation d\'appartement' })
  @ApiResponse({ status: 201, description: 'Réservation créée avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  @ApiResponse({ status: 409, description: 'Appartement non disponible pour cette période' })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  createApartmentReservation(
    @Body() dto: CreateReservationApartmentDto,
    @Request() req: any,
  ) {
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    const userId = req.user.userId;
    return this.reservationsService.createApartmentReservation(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des réservations' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filtrer par ID utilisateur' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrer par statut (PENDING, CONFIRMED, CANCELLED, COMPLETED)' })
  @ApiResponse({ status: 200, description: 'Liste des réservations retournée avec succès' })
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    // @Request() req,
  ) {
    // TODO: Si USER, utiliser req.user.id, si ADMIN, permettre userId en query
    return this.reservationsService.findAll(userId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer les détails d\'une réservation' })
  @ApiParam({ name: 'id', description: 'ID de la réservation' })
  @ApiResponse({ status: 200, description: 'Détails de la réservation retournés avec succès' })
  @ApiResponse({ status: 404, description: 'Réservation non trouvée' })
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id);
  }

  @Patch(':id/status')
  // @UseGuards(JwtAuthGuard)
  // @Roles('ADMIN', 'MANAGER')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.reservationsService.updateStatus(id, status);
  }

  @Patch(':id/cancel')
  // @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string) {
    return this.reservationsService.cancel(id);
  }
}
