import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

@ApiTags('partners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
@Controller('admin/partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un partenaire marchand (avec compte MERCHANT optionnel)' })
  create(@Body() dto: CreatePartnerDto, @Request() req) {
    return this.partnersService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les partenaires' })
  findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.partnersService.findAll({ status, category, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fiche complète d\'un partenaire (KYC)' })
  findOne(@Param('id') id: string) {
    return this.partnersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour un partenaire / changer son statut' })
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto, @Request() req) {
    return this.partnersService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un partenaire' })
  remove(@Param('id') id: string) {
    return this.partnersService.remove(id);
  }

  @Post(':id/risk-score')
  @ApiOperation({ summary: 'Calculer et enregistrer le score de risque KYC §7' })
  computeRisk(
    @Param('id') id: string,
    @Body() body: {
      country: number; shareholders: number; ppe: number;
      funds: number; volume: number; reputation: number; compliance: number;
    },
    @Request() req,
  ) {
    return this.partnersService.computeRiskScore(id, body, req.user.email);
  }
}
