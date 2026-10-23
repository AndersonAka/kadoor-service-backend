import { Controller, Get, Patch, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ReservationsService } from '../reservations/reservations.service';
import { AdminQueryDto } from './dto/admin-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'MANAGER', 'COMMERCIAL')
@RequirePermissions('reservations')
@Controller('admin/reservations')
export class AdminReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste paginée des réservations (admin, 10/page)' })
  @ApiResponse({ status: 200, description: 'Liste des réservations récupérée avec succès' })
  findAll(@Query() query: AdminQueryDto) {
    return this.reservationsService.findAllAdmin({
      status: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      search: query.search,
      type: query.type,
      period: query.period,
    });
  }

  @Get('internal')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Réservations internes d\'un bien' })
  listInternal(
    @Query('vehicleId') vehicleId?: string,
    @Query('apartmentId') apartmentId?: string,
  ) {
    return this.reservationsService.listInternalReservations(vehicleId, apartmentId);
  }

  @Post('internal')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Créer une réservation interne (occupe les dates côté public)' })
  createInternal(
    @Request() req: { user: { id: string; email?: string; role?: string } },
    @Body()
    body: { vehicleId?: string; apartmentId?: string; startDate: string; endDate: string; note?: string },
  ) {
    return this.reservationsService.createInternalReservation(req.user, body);
  }

  @Patch('internal/:id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Corriger les dates ou la note d\'une réservation interne' })
  updateInternal(
    @Request() req: { user: { id: string; email?: string; role?: string } },
    @Param('id') id: string,
    @Body() body: { startDate: string; endDate: string; note?: string },
  ) {
    return this.reservationsService.updateInternalReservation(id, req.user, body);
  }

  @Patch('internal/:id/cancel')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Annuler une réservation interne encore active' })
  cancelInternal(
    @Request() req: { user: { id: string; email?: string; role?: string } },
    @Param('id') id: string,
  ) {
    return this.reservationsService.cancelInternalReservation(id, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer les détails d\'une réservation (admin)' })
  @ApiParam({ name: 'id', description: 'ID de la réservation' })
  @ApiResponse({ status: 200, description: 'Détails de la réservation récupérés avec succès' })
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Modifier le statut d\'une réservation' })
  @ApiParam({ name: 'id', description: 'ID de la réservation' })
  @ApiResponse({ status: 200, description: 'Statut modifié avec succès' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.reservationsService.updateStatus(id, status);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une réservation' })
  @ApiParam({ name: 'id', description: 'ID de la réservation' })
  @ApiResponse({ status: 200, description: 'Réservation annulée avec succès' })
  cancel(@Param('id') id: string) {
    return this.reservationsService.cancel(id);
  }
}
