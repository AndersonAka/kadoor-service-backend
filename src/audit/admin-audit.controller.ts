import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('admin-audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Lister le journal d’audit (ADMIN uniquement)' })
  list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('outcome') outcome?: string,
    @Query('source') source?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditService.findMany({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
      actorId,
      action,
      entityType,
      entityId,
      outcome,
      source,
      from,
      to,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une entrée d’audit' })
  async getOne(@Param('id') id: string) {
    const row = await this.auditService.findOne(id);
    if (!row) throw new NotFoundException('Entrée d’audit introuvable');
    return row;
  }
}
