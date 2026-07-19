import {
  Controller, Get, Post, Body, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MerchantService } from './merchant.service';

class RequestOtpDto {
  @IsString() code: string;
}

class DeductDto {
  @IsString() code: string;
  @IsNumber() @Min(1) amount: number;
  @IsString() otpCode: string;
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
  getProfile(@Request() req: any) {
    return this.merchantService.getMyProfile(req.user.id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Statistiques du tableau de bord marchand' })
  getDashboard(@Request() req: any) {
    return this.merchantService.getDashboardStats(req.user.id);
  }

  @Get('gift-cards/lookup')
  @ApiOperation({ summary: 'Rechercher une carte cadeau par son code' })
  lookup(@Query('code') code: string) {
    return this.merchantService.lookupGiftCard(code);
  }

  @Post('gift-cards/request-otp')
  @ApiOperation({ summary: 'Demander un OTP pour sécuriser une transaction' })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.merchantService.requestOtp(dto.code);
  }

  @Post('gift-cards/deduct')
  @ApiOperation({ summary: 'Déduire un montant d\'une carte cadeau (OTP requis)' })
  deduct(@Body() dto: DeductDto, @Request() req: any) {
    return this.merchantService.deductFromGiftCard(
      req.user.id, dto.code, dto.amount, dto.otpCode, dto.note,
    );
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Historique des transactions du marchand' })
  getTransactions(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Bornes de sécurité : évite un page/limit invalide (NaN, négatif) ou abusif
    // (ex: ?limit=1000000) qui forcerait une requête DB disproportionnée.
    const parsedPage = Math.max(1, parseInt(page || '1', 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.merchantService.getTransactionHistory(req.user.id, parsedPage, parsedLimit, {
      search,
      startDate,
      endDate,
    });
  }
}
