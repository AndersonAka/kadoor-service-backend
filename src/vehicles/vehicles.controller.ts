import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehiclesDto } from './dto/query-vehicles.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des véhicules avec filtres et pagination' })
  @ApiResponse({ status: 200, description: 'Liste des véhicules retournée avec succès' })
  findAll(@Query() query: QueryVehiclesDto) {
    return this.vehiclesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer les détails d\'un véhicule' })
  @ApiParam({ name: 'id', description: 'ID du véhicule' })
  @ApiResponse({ status: 200, description: 'Détails du véhicule retournés avec succès' })
  @ApiResponse({ status: 404, description: 'Véhicule non trouvé' })
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Vérifier la disponibilité d\'un véhicule pour une période' })
  @ApiParam({ name: 'id', description: 'ID du véhicule' })
  @ApiQuery({ name: 'startDate', description: 'Date de début (ISO 8601)' })
  @ApiQuery({ name: 'endDate', description: 'Date de fin (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Disponibilité vérifiée avec succès' })
  checkAvailability(
    @Param('id') id: string,
    @Query() checkAvailabilityDto: CheckAvailabilityDto,
  ) {
    return this.vehiclesService.checkAvailability(
      id,
      checkAvailabilityDto.startDate,
      checkAvailabilityDto.endDate,
    );
  }

  @Patch(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
