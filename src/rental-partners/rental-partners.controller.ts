import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RentalPartnersService } from './rental-partners.service';

@ApiTags('rental-partners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RENTAL_PARTNER')
@Controller('rental-partner')
export class RentalPartnersController {
  constructor(private readonly rentalPartnersService: RentalPartnersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Profil partenaire du loueur connecté' })
  getProfile(@Request() req: any) {
    return this.rentalPartnersService.getMyProfile(req.user.id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Statistiques du tableau de bord loueur (flotte, réservations, revenus)' })
  getDashboard(@Request() req: any) {
    return this.rentalPartnersService.getDashboardStats(req.user.id);
  }

  @Get('vehicles')
  @ApiOperation({ summary: 'Véhicules rattachés au loueur connecté' })
  getVehicles(@Request() req: any) {
    return this.rentalPartnersService.getMyVehicles(req.user.id);
  }

  @Get('apartments')
  @ApiOperation({ summary: 'Logements rattachés au loueur connecté' })
  getApartments(@Request() req: any) {
    return this.rentalPartnersService.getMyApartments(req.user.id);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Réservations reçues sur les biens du loueur connecté' })
  getBookings(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = Math.max(1, parseInt(page || '1', 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.rentalPartnersService.getMyBookings(req.user.id, parsedPage, parsedLimit);
  }
}
