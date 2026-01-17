import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Récupérer les statistiques du dashboard admin' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  // @ApiBearerAuth()
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/charts')
  @ApiOperation({ summary: 'Récupérer les données pour les graphiques' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month', 'year'], required: false, description: 'Période pour les graphiques' })
  @ApiResponse({ status: 200, description: 'Données des graphiques récupérées avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  // @ApiBearerAuth()
  async getChartData(@Query('period') period: 'day' | 'week' | 'month' | 'year' = 'month') {
    return this.adminService.getChartData(period);
  }
}
