import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateVehicleDto } from '../vehicles/dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../vehicles/dto/update-vehicle.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';

@ApiTags('admin')
@Controller('admin/vehicles')
export class AdminVehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des véhicules (admin)' })
  @ApiResponse({ status: 200, description: 'Liste des véhicules récupérée avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  // @ApiBearerAuth()
  findAll(@Query() query: AdminQueryDto) {
    // Pour l'admin, on peut retourner tous les véhicules (même non disponibles)
    // TODO: Adapter le service pour accepter un paramètre includeUnavailable
    return this.vehiclesService.findAll(query as any);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer les détails d\'un véhicule (admin)' })
  @ApiParam({ name: 'id', description: 'ID du véhicule' })
  @ApiResponse({ status: 200, description: 'Détails du véhicule récupérés avec succès' })
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau véhicule' })
  @ApiResponse({ status: 201, description: 'Véhicule créé avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  // @ApiBearerAuth()
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un véhicule' })
  @ApiParam({ name: 'id', description: 'ID du véhicule' })
  @ApiResponse({ status: 200, description: 'Véhicule modifié avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  // @ApiBearerAuth()
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto) {
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un véhicule' })
  @ApiParam({ name: 'id', description: 'ID du véhicule' })
  @ApiResponse({ status: 200, description: 'Véhicule supprimé avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  // @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }

  @Post(':id/images')
  @ApiOperation({ summary: 'Upload des images pour un véhicule' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID du véhicule' })
  @ApiResponse({ status: 200, description: 'Images uploadées avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  // @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    // TODO: Implémenter l'upload vers S3/Cloudinary
    // Pour l'instant, retourner les noms de fichiers
    const imageUrls = files.map((file) => `/uploads/vehicles/${file.filename}`);
    
    // Mettre à jour le véhicule avec les nouvelles images
    const vehicle = await this.vehiclesService.findOne(id);
    const updatedImages = [...(vehicle.images || []), ...imageUrls];
    
    return this.vehiclesService.update(id, { images: updatedImages } as UpdateVehicleDto);
  }
}
