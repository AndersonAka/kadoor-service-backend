import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ApartmentsService } from './apartments.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { QueryApartmentsDto } from './dto/query-apartments.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('apartments')
@Controller('apartments')
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  create(@Body() createApartmentDto: CreateApartmentDto) {
    return this.apartmentsService.create(createApartmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des appartements avec filtres et pagination' })
  @ApiResponse({ status: 200, description: 'Liste des appartements retournée avec succès' })
  findAll(@Query() query: QueryApartmentsDto) {
    // Vue publique : jamais les biens en attente/refusés, quels que soient les paramètres envoyés.
    return this.apartmentsService.findAll({ ...query, includeAllStatuses: false, status: undefined });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer les détails d\'un appartement' })
  @ApiParam({ name: 'id', description: 'ID de l\'appartement' })
  @ApiResponse({ status: 200, description: 'Détails de l\'appartement retournés avec succès' })
  @ApiResponse({ status: 404, description: 'Appartement non trouvé' })
  findOne(@Param('id') id: string) {
    return this.apartmentsService.findPublicOne(id);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Vérifier la disponibilité d\'un appartement pour une période' })
  @ApiParam({ name: 'id', description: 'ID de l\'appartement' })
  @ApiQuery({ name: 'startDate', description: 'Date de début (ISO 8601)' })
  @ApiQuery({ name: 'endDate', description: 'Date de fin (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Disponibilité vérifiée avec succès' })
  checkAvailability(
    @Param('id') id: string,
    @Query() checkAvailabilityDto: CheckAvailabilityDto,
  ) {
    return this.apartmentsService.checkAvailability(
      id,
      checkAvailabilityDto.startDate,
      checkAvailabilityDto.endDate,
    );
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() updateApartmentDto: UpdateApartmentDto) {
    return this.apartmentsService.update(id, updateApartmentDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.apartmentsService.remove(id);
  }
}
