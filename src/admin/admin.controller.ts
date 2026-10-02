import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('admin')
// Réservé au back-office : sans ces gardes, n'importe quel visiteur pouvait lire les clients
// ou valider lui-même un bien (PATCH status=APPROVED).
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'MANAGER', 'COMMERCIAL')
@RequirePermissions('dashboard')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Récupérer les statistiques du dashboard admin' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/charts')
  @ApiOperation({ summary: 'Récupérer les données pour les graphiques' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'year'], required: false, description: 'Période pour les graphiques' })
  @ApiResponse({ status: 200, description: 'Données des graphiques récupérées avec succès' })
  async getChartData(@Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month') {
    return this.adminService.getChartData(period);
  }
}
