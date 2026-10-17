'use strict';

import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
   * Lecture des globales : table `NotificationRead` (reçu par utilisateur).
   */
  private visibilityWhere(userId: string, isStaff: boolean, unreadOnly = false) {
    if (!isStaff) {
      return {
        userId,
        isGlobal: false,
        ...(unreadOnly ? { isRead: false } : {}),
      };
    }

    return {
      OR: [
        {
          userId,
          isGlobal: false,
          ...(unreadOnly ? { isRead: false } : {}),
        },
        {
          isGlobal: true,
          ...(unreadOnly
            ? { reads: { none: { userId } } }
            : {}),
        },
      ],
    };
  }

  /** `isRead` effectif : colonne pour les personnelles, reçu pour les globales. */
  private withEffectiveRead<T extends { id: string; isGlobal: boolean; isRead: boolean; reads?: { id: string }[] }>(
    notifications: T[],
  ) {
    return notifications.map(({ reads, ...n }) => ({
      ...n,
      isRead: n.isGlobal ? (reads?.length ?? 0) > 0 : n.isRead,
    }));
  }

  async getUserNotifications(
    userId: string,
    isStaff: boolean,
    options: { page: number; limit: number; unreadOnly: boolean },
  ) {
    const { page, limit, unreadOnly } = options;
    const skip = (page - 1) * limit;
    const whereClause = this.visibilityWhere(userId, isStaff, unreadOnly);

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          reads: {
            where: { userId },
            select: { id: true },
            take: 1,
          },
        },
      }),
      this.prisma.notification.count({ where: whereClause }),
    ]);

    return {
      data: this.withEffectiveRead(notifications),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: string, isStaff: boolean) {
    const personalCount = await this.prisma.notification.count({
      where: { userId, isGlobal: false, isRead: false },
    });

    if (!isStaff) {
      return { count: personalCount };
    }

    const globalUnread = await this.prisma.notification.count({
      where: {
        isGlobal: true,
        reads: { none: { userId } },
      },
    });

    return { count: personalCount + globalUnread };
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

    if (notification.isGlobal) {
      await this.prisma.notificationRead.upsert({
        where: {
          notificationId_userId: { notificationId, userId },
        },
        create: { notificationId, userId },
        update: {},
      });
      return { ...notification, isRead: true };
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string, isStaff: boolean) {
    await this.prisma.notification.updateMany({
      where: { userId, isGlobal: false, isRead: false },
      data: { isRead: true },
    });

    if (isStaff) {
      const unreadGlobals = await this.prisma.notification.findMany({
        where: {
          isGlobal: true,
          reads: { none: { userId } },
        },
        select: { id: true },
      });

      if (unreadGlobals.length > 0) {
        await this.prisma.notificationRead.createMany({
          data: unreadGlobals.map((n) => ({
            notificationId: n.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return { success: true };
  }

  async deleteNotification(notificationId: string, userId: string, _isStaff: boolean) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    // Les isGlobal sont partagées : un delete les retire pour tout le staff.
    if (notification.isGlobal) {
      throw new ForbiddenException(
        'Les notifications staff partagées ne peuvent pas être supprimées individuellement',
      );
    }

    if (notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({ where: { id: notificationId } });
    return { success: true };
  }

  /**
   * Ne supprime QUE les notifs personnelles lues.
   * Les `isGlobal` sont partagées entre le staff : un seul deleteMany les effacerait pour tous.
   */
  async deleteAllRead(userId: string, _isStaff: boolean) {
    await this.prisma.notification.deleteMany({
      where: {
        userId,
        isGlobal: false,
        isRead: true,
      },
    });
    return { success: true };
  }

  // Helper methods for creating specific notification types
  async notifyNewReservation(_userId: string, itemTitle: string, bookingId: string) {
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
      link: `/bookings/${bookingId}`,
      userId,
    });
  }

  async notifyReservationCancelled(userId: string, itemTitle: string, _bookingId?: string) {
    return this.createNotification({
      type: 'RESERVATION_CANCELLED',
      titleFr: 'Réservation annulée',
      titleEn: 'Reservation cancelled',
      messageFr: `Votre réservation pour "${itemTitle}" a été annulée`,
      messageEn: `Your reservation for "${itemTitle}" has been cancelled`,
      link: `/bookings`,
      userId,
    });
  }

  async notifyPaymentReceived(_userId: string, amount: number, bookingId: string) {
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
      link: `/admin`,
      isGlobal: true,
    });
  }

  async notifyNewIncident(incidentTitle: string, _incidentId: string) {
    return this.createNotification({
      type: 'INCIDENT_NEW',
      titleFr: 'Nouvel incident signalé',
      titleEn: 'New incident reported',
      messageFr: `Nouvel incident: "${incidentTitle}"`,
      messageEn: `New incident: "${incidentTitle}"`,
      link: `/admin/incidents`,
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
      link: `/contact`,
      userId,
    });
  }
}
