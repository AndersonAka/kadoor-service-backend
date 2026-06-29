import {
  Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GiftCardsService } from './gift-cards.service';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';

@ApiTags('gift-cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gift-cards')
export class GiftCardsController {
  constructor(private readonly giftCardsService: GiftCardsService) {}

  @Post()
  @ApiOperation({ summary: 'Précommander une carte cadeau (client)' })
  create(@Body() dto: CreateGiftCardDto, @Request() req) {
    return this.giftCardsService.create(dto, req.user.id);
  }

  @Get('my')
  @ApiOperation({ summary: 'Mes cartes cadeaux (client connecté)' })
  getMyCards(@Request() req) {
    return this.giftCardsService.findMyCards(req.user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Toutes les cartes cadeaux (admin)' })
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.giftCardsService.findAll({
      status,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Détail d\'une carte cadeau (admin)' })
  findOne(@Param('id') id: string) {
    return this.giftCardsService.findOne(id);
  }

  @Patch(':id/validate')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Valider une carte cadeau' })
  validate(@Param('id') id: string, @Request() req) {
    return this.giftCardsService.validate(id, req.user.id);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Annuler une carte cadeau' })
  cancel(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.giftCardsService.cancel(id, reason);
  }
}
