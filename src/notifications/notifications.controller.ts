'use strict';

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InAppNotificationsService } from './in-app-notifications.service';

interface AuthenticatedRequest {
  user: {
    id: string;
    role: string;
  };
}

/** Staff back-office : voient les notifs `isGlobal` (ops admin). */
const STAFF_ROLES = new Set(['ADMIN', 'MANAGER', 'COMMERCIAL']);

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: InAppNotificationsService) {}

  private isStaff(role: string) {
    return STAFF_ROLES.has(role);
  }

  @Get()
  async getUserNotifications(
    @Request() req: AuthenticatedRequest,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('unreadOnly') unreadOnly: string = 'false',
  ) {
    const userId = req.user.id;
    const isStaff = this.isStaff(req.user.role);
    return this.notificationsService.getUserNotifications(userId, isStaff, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const isStaff = this.isStaff(req.user.role);
    return this.notificationsService.getUnreadCount(userId, isStaff);
  }

  @Patch(':id/read')
  async markAsRead(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = req.user.id;
    const isStaff = this.isStaff(req.user.role);
    return this.notificationsService.markAsRead(id, userId, isStaff);
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const isStaff = this.isStaff(req.user.role);
    return this.notificationsService.markAllAsRead(userId, isStaff);
  }

  @Delete(':id')
  async deleteNotification(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const userId = req.user.id;
    const isStaff = this.isStaff(req.user.role);
    return this.notificationsService.deleteNotification(id, userId, isStaff);
  }

  @Delete()
  async deleteAllRead(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const isStaff = this.isStaff(req.user.role);
    return this.notificationsService.deleteAllRead(userId, isStaff);
  }

  // Admin endpoints — broadcast staff (isGlobal), pas les clients
  @Post('admin/broadcast')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async broadcastNotification(
    @Body() data: { titleFr: string; titleEn: string; messageFr: string; messageEn: string; link?: string },
  ) {
    return this.notificationsService.createAdminBroadcast(data);
  }
}
