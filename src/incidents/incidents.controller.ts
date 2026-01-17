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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtOptionalGuard } from '../auth/jwt-optional.guard';

@ApiTags('incidents')
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @ApiOperation({ summary: 'Déclarer un incident' })
  @ApiResponse({ status: 201, description: 'Incident déclaré avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @UseGuards(JwtOptionalGuard)
  createIncident(
    @Body() dto: CreateIncidentDto,
    @Request() req: any,
  ) {
    // Récupérer userId depuis le token si présent (optionnel)
    // Les utilisateurs non connectés peuvent déclarer un incident
    const userId = req.user?.userId || null;
    return this.incidentsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des incidents' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filtrer par ID utilisateur' })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrer par statut' })
  @ApiResponse({ status: 200, description: 'Liste des incidents retournée avec succès' })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  findAll(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
    @Request() req?: any,
  ) {
    // Si l'utilisateur n'est pas admin, ne retourner que ses propres incidents
    const currentUserId = req?.user?.userId;
    const filterUserId = req?.user?.role === 'ADMIN' ? userId : currentUserId;
    
    return this.incidentsService.findAll(filterUserId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer les détails d\'un incident' })
  @ApiParam({ name: 'id', description: 'ID de l\'incident' })
  @ApiResponse({ status: 200, description: 'Détails de l\'incident retournés avec succès' })
  @ApiResponse({ status: 404, description: 'Incident non trouvé' })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Mettre à jour le statut d\'un incident' })
  @ApiParam({ name: 'id', description: 'ID de l\'incident' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour avec succès' })
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.incidentsService.updateStatus(id, status);
  }
}
