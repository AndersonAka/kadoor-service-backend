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

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: InAppNotificationsService) {}

  @Get()
  async getUserNotifications(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('unreadOnly') unreadOnly: string = 'false',
  ) {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    return this.notificationsService.getUserNotifications(userId, isAdmin, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    return this.notificationsService.getUnreadCount(userId, isAdmin);
  }

  @Patch(':id/read')
  async markAsRead(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    return this.notificationsService.markAllAsRead(userId, isAdmin);
  }

  @Delete(':id')
  async deleteNotification(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.notificationsService.deleteNotification(id, userId);
  }

  @Delete()
  async deleteAllRead(@Request() req) {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    return this.notificationsService.deleteAllRead(userId, isAdmin);
  }

  // Admin endpoints
  @Post('admin/broadcast')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async broadcastNotification(
    @Body() data: { titleFr: string; titleEn: string; messageFr: string; messageEn: string; link?: string },
  ) {
    return this.notificationsService.createAdminBroadcast(data);
  }
}
