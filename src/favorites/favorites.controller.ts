import { Controller, Get, Post, Delete, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  private getUserId(req: Request & { user: any }): string {
    return req.user.id || req.user.userId || req.user.sub;
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer les favoris de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Liste des favoris' })
  async getUserFavorites(
    @Req() req: Request & { user: any },
    @Query('type') type?: 'vehicle' | 'apartment',
  ) {
    return this.favoritesService.getUserFavorites(this.getUserId(req), type);
  }

  @Post()
  @ApiOperation({ summary: 'Ajouter un favori' })
  @ApiResponse({ status: 201, description: 'Favori ajouté' })
  async addFavorite(
    @Req() req: Request & { user: any },
    @Body() body: { vehicleId?: string; apartmentId?: string },
  ) {
    return this.favoritesService.addFavorite(this.getUserId(req), body.vehicleId, body.apartmentId);
  }

  @Delete()
  @ApiOperation({ summary: 'Supprimer un favori' })
  @ApiResponse({ status: 200, description: 'Favori supprimé' })
  async removeFavorite(
    @Req() req: Request & { user: any },
    @Body() body: { vehicleId?: string; apartmentId?: string },
  ) {
    return this.favoritesService.removeFavorite(this.getUserId(req), body.vehicleId, body.apartmentId);
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Basculer l\'état d\'un favori' })
  @ApiResponse({ status: 200, description: 'État du favori basculé' })
  async toggleFavorite(
    @Req() req: Request & { user: any },
    @Body() body: { vehicleId?: string; apartmentId?: string },
  ) {
    return this.favoritesService.toggleFavorite(this.getUserId(req), body.vehicleId, body.apartmentId);
  }

  @Get('check')
  @ApiOperation({ summary: 'Vérifier si un élément est en favori' })
  @ApiResponse({ status: 200, description: 'Statut du favori' })
  async checkFavorite(
    @Req() req: Request & { user: any },
    @Query('vehicleId') vehicleId?: string,
    @Query('apartmentId') apartmentId?: string,
  ) {
    const isFavorite = await this.favoritesService.isFavorite(this.getUserId(req), vehicleId, apartmentId);
    return { isFavorite };
  }
}
