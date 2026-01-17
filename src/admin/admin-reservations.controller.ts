import { Controller, Get, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ReservationsService } from '../reservations/reservations.service';
import { AdminQueryDto } from './dto/admin-query.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';

@ApiTags('admin')
@Controller('admin/reservations')
export class AdminReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des réservations (admin)' })
  @ApiResponse({ status: 200, description: 'Liste des réservations récupérée avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  // @ApiBearerAuth()
  findAll(@Query() query: AdminQueryDto) {
    return this.reservationsService.findAll(query.userId, query.status);
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
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  // @ApiBearerAuth()
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.reservationsService.updateStatus(id, status);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une réservation' })
  @ApiParam({ name: 'id', description: 'ID de la réservation' })
  @ApiResponse({ status: 200, description: 'Réservation annulée avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  // @ApiBearerAuth()
  cancel(@Param('id') id: string) {
    return this.reservationsService.cancel(id);
  }
}
