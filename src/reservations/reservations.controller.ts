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
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
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
    // Support both 'id' (from full user object) and 'userId' (from JWT payload fallback)
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
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
    // Support both 'id' (from full user object) and 'userId' (from JWT payload fallback)
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    return this.reservationsService.createApartmentReservation(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des réservations' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filtrer par ID utilisateur' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrer par statut (PENDING, CONFIRMED, CANCELLED, COMPLETED)' })
  @ApiQuery({ name: 'page', required: false, description: 'Numéro de page (défaut: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre d\'éléments par page (défaut: 10)' })
  @ApiResponse({ status: 200, description: 'Liste des réservations retournée avec succès' })
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    // @Request() req,
  ) {
    // TODO: Si USER, utiliser req.user.id, si ADMIN, permettre userId en query
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.reservationsService.findAll(userId, status, pageNum, limitNum);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Récupérer les détails d\'une réservation' })
  @ApiParam({ name: 'id', description: 'ID de la réservation' })
  @ApiResponse({ status: 200, description: 'Détails de la réservation retournés avec succès' })
  @ApiResponse({ status: 404, description: 'Réservation non trouvée' })
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

  // ─── Paystack Payment Endpoints ──────────────────────────────────────

  @Post('vehicles/initiate-payment')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une réservation véhicule et initier le paiement Paystack' })
  async initiateVehiclePayment(
    @Body() dto: CreateReservationVehicleDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('Utilisateur non authentifié');
    const userEmail = req.user?.email;
    return this.reservationsService.initiateVehiclePayment(userId, userEmail, dto);
  }

  @Post('apartments/initiate-payment')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une réservation appartement et initier le paiement Paystack' })
  async initiateApartmentPayment(
    @Body() dto: CreateReservationApartmentDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) throw new UnauthorizedException('Utilisateur non authentifié');
    const userEmail = req.user?.email;
    return this.reservationsService.initiateApartmentPayment(userId, userEmail, dto);
  }

  @Post('verify-payment/:bookingId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vérifier le paiement Paystack et confirmer la réservation' })
  async verifyPayment(@Param('bookingId') bookingId: string) {
    return this.reservationsService.verifyPayment(bookingId);
  }

  @Post('paystack/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Paystack (public)' })
  async handleWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    const rawBody = req.rawBody?.toString() || JSON.stringify(body);
    return this.reservationsService.handleWebhook(signature, rawBody, body);
  }
}
