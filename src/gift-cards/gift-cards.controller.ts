import {
  Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GiftCardsService } from './gift-cards.service';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';

@ApiTags('gift-cards')
@ApiBearerAuth()
@Controller('gift-cards')
export class GiftCardsController {
  constructor(private readonly giftCardsService: GiftCardsService) {}

  /** Route publique — sans authentification */
  @Get('public/:code')
  @ApiOperation({ summary: 'Vue publique d\'une carte cadeau par son code' })
  @HttpCode(HttpStatus.OK)
  findPublic(@Param('code') code: string) {
    return this.giftCardsService.findByCodePublic(code);
  }

  /** Commande + paiement Paystack — remplace la précommande */
  @UseGuards(JwtAuthGuard)
  @Post('initiate-payment')
  @ApiOperation({ summary: 'Commander une carte cadeau et initialiser le paiement Paystack' })
  initiatePayment(@Body() dto: CreateGiftCardDto, @Request() req: any) {
    return this.giftCardsService.initiatePayment(dto, req.user.id);
  }

  /** Vérification paiement après retour Paystack */
  @UseGuards(JwtAuthGuard)
  @Post('verify-payment/:id')
  @ApiOperation({ summary: 'Vérifier le paiement Paystack d\'une carte cadeau' })
  verifyPayment(@Param('id') id: string, @Query('reference') reference?: string) {
    return this.giftCardsService.verifyPayment(id, reference);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiOperation({ summary: 'Mes cartes cadeaux (client connecté)' })
  getMyCards(@Request() req: any) {
    return this.giftCardsService.findMyCards(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/stats')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Statistiques cartes cadeaux (admin)' })
  getAdminStats() {
    return this.giftCardsService.getAdminStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Détail d\'une carte cadeau (admin)' })
  findOne(@Param('id') id: string) {
    return this.giftCardsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/cancel')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Annuler une carte cadeau (admin)' })
  cancel(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.giftCardsService.cancel(id, reason);
  }
}
