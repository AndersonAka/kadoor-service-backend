import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('cross-sell')
  @ApiOperation({ summary: 'Recommandations cross-sell (véhicule ↔ appartement)' })
  @ApiQuery({ name: 'sourceType', enum: ['vehicle', 'apartment'] })
  @ApiQuery({ name: 'sourceId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getCrossSell(
    @Query('sourceType') sourceType: 'vehicle' | 'apartment',
    @Query('sourceId') sourceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.recommendationsService.getCrossSell({
      sourceType,
      sourceId,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : 6,
    });
  }
}
