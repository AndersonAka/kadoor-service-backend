import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { ApartmentsService } from '../apartments/apartments.service';
import { CreateApartmentDto } from '../apartments/dto/create-apartment.dto';
import { UpdateApartmentDto } from '../apartments/dto/update-apartment.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';

@ApiTags('admin')
@Controller('admin/apartments')
export class AdminApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des appartements (admin)' })
  @ApiResponse({ status: 200, description: 'Liste des appartements récupérée avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  // @ApiBearerAuth()
  findAll(@Query() query: AdminQueryDto) {
    // Pour l'admin, on peut retourner tous les appartements (même non disponibles)
    return this.apartmentsService.findAll(query as any);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer les détails d\'un appartement (admin)' })
  @ApiParam({ name: 'id', description: 'ID de l\'appartement' })
  @ApiResponse({ status: 200, description: 'Détails de l\'appartement récupérés avec succès' })
  findOne(@Param('id') id: string) {
    return this.apartmentsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un nouvel appartement' })
  @ApiResponse({ status: 201, description: 'Appartement créé avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  // @ApiBearerAuth()
  create(@Body() createApartmentDto: CreateApartmentDto) {
    return this.apartmentsService.create(createApartmentDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un appartement' })
  @ApiParam({ name: 'id', description: 'ID de l\'appartement' })
  @ApiResponse({ status: 200, description: 'Appartement modifié avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  // @ApiBearerAuth()
  update(@Param('id') id: string, @Body() updateApartmentDto: UpdateApartmentDto) {
    return this.apartmentsService.update(id, updateApartmentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un appartement' })
  @ApiParam({ name: 'id', description: 'ID de l\'appartement' })
  @ApiResponse({ status: 200, description: 'Appartement supprimé avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  // @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.apartmentsService.remove(id);
  }

  @Post(':id/images')
  @ApiOperation({ summary: 'Upload des images pour un appartement' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID de l\'appartement' })
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
    const imageUrls = files.map((file) => `/uploads/apartments/${file.filename}`);
    
    const apartment = await this.apartmentsService.findOne(id);
    const updatedImages = [...(apartment.images || []), ...imageUrls];
    
    return this.apartmentsService.update(id, { images: updatedImages } as UpdateApartmentDto);
  }
}
