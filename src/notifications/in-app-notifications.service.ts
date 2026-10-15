'use strict';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type NotificationTypeEnum = 
  | 'RESERVATION_NEW'
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_CANCELLED'
  | 'RESERVATION_COMPLETED'
  | 'PAYMENT_RECEIVED'
  | 'REVIEW_NEW'
  | 'INCIDENT_NEW'
  | 'INCIDENT_UPDATED'
  | 'SYSTEM';

interface CreateNotificationDto {
  type: NotificationTypeEnum;
  titleFr: string;
  titleEn: string;
  messageFr: string;
  messageEn: string;
  link?: string;
  userId?: string;
  isGlobal?: boolean;
}

@Injectable()
export class InAppNotificationsService {
  private readonly logger = new Logger(InAppNotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createNotification(data: CreateNotificationDto) {
    try {
      return await this.prisma.notification.create({
        data: {
          type: data.type,
          titleFr: data.titleFr,
          titleEn: data.titleEn,
          messageFr: data.messageFr,
          messageEn: data.messageEn,
          link: data.link,
          userId: data.userId,
          isGlobal: data.isGlobal || false,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create notification', error);
      throw error;
    }
  }

  async createAdminBroadcast(data: {
    titleFr: string;
    titleEn: string;
    messageFr: string;
    messageEn: string;
    link?: string;
  }) {
    return this.createNotification({
      type: 'SYSTEM',
      ...data,
      isGlobal: true,
    });
  }

  /**
   * `isGlobal` = feed staff (admin / manager / commercial), JAMAIS les clients ni partenaires.
   * Client / marchand / loueur : uniquement les notifs avec leur `userId`.
   */
  private visibilityWhere(userId: string, isStaff: boolean) {
    if (isStaff) {
      return { OR: [{ isGlobal: true }, { userId }] };
    }
    return { userId, isGlobal: false };
  }

  async getUserNotifications(
    userId: string,
    isStaff: boolean,
    options: { page: number; limit: number; unreadOnly: boolean },
  ) {
    const { page, limit, unreadOnly } = options;
    const skip = (page - 1) * limit;

    const whereClause = {
      ...this.visibilityWhere(userId, isStaff),
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: whereClause }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string, isStaff: boolean) {
    const whereClause = {
      ...this.visibilityWhere(userId, isStaff),
      isRead: false,
    };

    const count = await this.prisma.notification.count({ where: whereClause });
    return { count };
  }

  async markAsRead(notificationId: string, userId: string, isStaff: boolean) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const canAccess = notification.isGlobal
      ? isStaff
      : notification.userId === userId;

    if (!canAccess) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string, isStaff: boolean) {
    await this.prisma.notification.updateMany({
      where: {
        ...this.visibilityWhere(userId, isStaff),
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  }

  async deleteNotification(notificationId: string, userId: string, isStaff: boolean) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const canAccess = notification.isGlobal
      ? isStaff
      : notification.userId === userId;

    if (!canAccess) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({ where: { id: notificationId } });
    return { success: true };
  }

  async deleteAllRead(userId: string, isStaff: boolean) {
    await this.prisma.notification.deleteMany({
      where: {
        ...this.visibilityWhere(userId, isStaff),
        isRead: true,
      },
    });
    return { success: true };
  }

  // Helper methods for creating specific notification types
  async notifyNewReservation(userId: string, itemTitle: string, bookingId: string) {
    return this.createNotification({
      type: 'RESERVATION_NEW',
      titleFr: 'Nouvelle réservation',
      titleEn: 'New reservation',
      messageFr: `Nouvelle réservation pour "${itemTitle}"`,
      messageEn: `New reservation for "${itemTitle}"`,
      link: `/admin/reservations/${bookingId}`,
      isGlobal: true,
    });
  }

  async notifyReservationConfirmed(userId: string, itemTitle: string, bookingId: string) {
    return this.createNotification({
      type: 'RESERVATION_CONFIRMED',
      titleFr: 'Réservation confirmée',
      titleEn: 'Reservation confirmed',
      messageFr: `Votre réservation pour "${itemTitle}" a été confirmée`,
      messageEn: `Your reservation for "${itemTitle}" has been confirmed`,
      link: `/dashboard/reservations/${bookingId}`,
      userId,
    });
  }

  async notifyReservationCancelled(userId: string, itemTitle: string, bookingId: string) {
    return this.createNotification({
      type: 'RESERVATION_CANCELLED',
      titleFr: 'Réservation annulée',
      titleEn: 'Reservation cancelled',
      messageFr: `Votre réservation pour "${itemTitle}" a été annulée`,
      messageEn: `Your reservation for "${itemTitle}" has been cancelled`,
      link: `/dashboard/reservations`,
      userId,
    });
  }

  async notifyPaymentReceived(userId: string, amount: number, bookingId: string) {
    return this.createNotification({
      type: 'PAYMENT_RECEIVED',
      titleFr: 'Paiement reçu',
      titleEn: 'Payment received',
      messageFr: `Paiement de ${amount.toLocaleString('fr-FR')} FCFA reçu`,
      messageEn: `Payment of ${amount.toLocaleString('fr-FR')} FCFA received`,
      link: `/admin/reservations/${bookingId}`,
      isGlobal: true,
    });
  }

  async notifyNewReview(itemTitle: string, rating: number) {
    return this.createNotification({
      type: 'REVIEW_NEW',
      titleFr: 'Nouvel avis',
      titleEn: 'New review',
      messageFr: `Nouvel avis (${rating}★) pour "${itemTitle}"`,
      messageEn: `New review (${rating}★) for "${itemTitle}"`,
      link: `/admin/reviews`,
      isGlobal: true,
    });
  }

  async notifyNewIncident(incidentTitle: string, incidentId: string) {
    return this.createNotification({
      type: 'INCIDENT_NEW',
      titleFr: 'Nouvel incident signalé',
      titleEn: 'New incident reported',
      messageFr: `Nouvel incident: "${incidentTitle}"`,
      messageEn: `New incident: "${incidentTitle}"`,
      link: `/admin/incidents/${incidentId}`,
      isGlobal: true,
    });
  }

  async notifyIncidentUpdate(userId: string, incidentTitle: string, newStatus: string) {
    return this.createNotification({
      type: 'INCIDENT_UPDATED',
      titleFr: 'Incident mis à jour',
      titleEn: 'Incident updated',
      messageFr: `L'incident "${incidentTitle}" est maintenant: ${newStatus}`,
      messageEn: `Incident "${incidentTitle}" is now: ${newStatus}`,
      link: `/dashboard/incidents`,
      userId,
    });
  }
}
