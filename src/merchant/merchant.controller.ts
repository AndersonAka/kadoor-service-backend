import {
  Controller, Get, Post, Body, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MerchantService } from './merchant.service';

class DeductDto {
  @IsString() code: string;
  @IsNumber() @Min(1) amount: number;
  @IsOptional() @IsString() note?: string;
}

@ApiTags('merchant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT')
@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Profil partenaire du marchand connecté' })
  getProfile(@Request() req) {
    return this.merchantService.getMyProfile(req.user.id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Statistiques du tableau de bord marchand' })
  getDashboard(@Request() req) {
    return this.merchantService.getDashboardStats(req.user.id);
  }

  @Get('gift-cards/lookup')
  @ApiOperation({ summary: 'Rechercher une carte cadeau par son code' })
  lookup(@Query('code') code: string) {
    return this.merchantService.lookupGiftCard(code);
  }

  @Post('gift-cards/deduct')
  @ApiOperation({ summary: 'Déduire un montant d\'une carte cadeau' })
  deduct(@Body() dto: DeductDto, @Request() req) {
    return this.merchantService.deductFromGiftCard(req.user.id, dto.code, dto.amount, dto.note);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Historique des transactions du marchand' })
  getTransactions(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.merchantService.getTransactionHistory(
      req.user.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
