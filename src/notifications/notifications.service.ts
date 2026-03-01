import { Injectable, Logger } from '@nestjs/common';
import { OneSignalService, EmailPayload, PushPayload } from './onesignal.service';
import { PrismaService } from '../prisma/prisma.service';

export enum EmailTemplate {
  RESERVATION_CONFIRMATION = 'reservation_confirmation',
  RESERVATION_CANCELLED = 'reservation_cancelled',
  RESERVATION_REMINDER = 'reservation_reminder',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  PAYMENT_RECEIPT = 'payment_receipt',
  NEWSLETTER = 'newsletter',
}

export enum NotificationType {
  RESERVATION_CREATED = 'reservation_created',
  RESERVATION_CONFIRMED = 'reservation_confirmed',
  RESERVATION_CANCELLED = 'reservation_cancelled',
  RESERVATION_REMINDER = 'reservation_reminder',
  PAYMENT_SUCCESS = 'payment_success',
  NEW_MESSAGE = 'new_message',
  PROMO = 'promo',
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private oneSignalService: OneSignalService,
    private prisma: PrismaService,
  ) {}

  /**
   * Send reservation confirmation email
   */
  async sendReservationConfirmation(
    userId: string,
    reservationId: string,
    itemType: 'vehicle' | 'apartment',
  ): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const booking = await this.prisma.booking.findUnique({
        where: { id: reservationId },
        include: { vehicle: true, apartment: true },
      });

      if (!user?.email || !booking) {
        this.logger.warn('Cannot send confirmation - user or booking not found');
        return false;
      }

      const item = itemType === 'vehicle' ? booking.vehicle : booking.apartment;
      const startDate = new Date(booking.startDate).toLocaleDateString('fr-FR');
      const endDate = new Date(booking.endDate).toLocaleDateString('fr-FR');

      const emailPayload: EmailPayload = {
        to: user.email,
        subject: `Confirmation de votre réservation #${reservationId.slice(-8)}`,
        body: this.generateReservationConfirmationEmail({
          userName: user.firstName || 'Client',
          itemTitle: item?.title || 'Service',
          itemType: itemType === 'vehicle' ? 'Véhicule' : 'Appartement',
          startDate,
          endDate,
          totalPrice: booking.totalPrice,
          bookingRef: reservationId.slice(-8).toUpperCase(),
        }),
        data: { reservationId, itemType },
      };

      const result = await this.oneSignalService.sendEmail(emailPayload);
      
      // Also send push notification
      await this.oneSignalService.sendPush({
        userId,
        title: 'Réservation confirmée',
        message: `Votre réservation pour ${item?.title} a été confirmée.`,
        data: { reservationId, type: NotificationType.RESERVATION_CONFIRMED },
      });

      return result.success;
    } catch (error) {
      this.logger.error('Failed to send reservation confirmation', error);
      return false;
    }
  }

  /**
   * Send reservation cancellation email
   */
  async sendReservationCancellation(userId: string, reservationId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const booking = await this.prisma.booking.findUnique({
        where: { id: reservationId },
        include: { vehicle: true, apartment: true },
      });

      if (!user?.email || !booking) return false;

      const item = booking.vehicle || booking.apartment;

      const result = await this.oneSignalService.sendEmail({
        to: user.email,
        subject: `Annulation de réservation #${reservationId.slice(-8)}`,
        body: this.generateCancellationEmail({
          userName: user.firstName || 'Client',
          itemTitle: item?.title || 'Service',
          bookingRef: reservationId.slice(-8).toUpperCase(),
        }),
      });

      return result.success;
    } catch (error) {
      this.logger.error('Failed to send cancellation email', error);
      return false;
    }
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(userId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.email) return false;

      // Register user in OneSignal
      await this.oneSignalService.createOrUpdateUser(userId, user.email, {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role,
      });

      const result = await this.oneSignalService.sendEmail({
        to: user.email,
        subject: 'Bienvenue chez KADOOR SERVICE',
        body: this.generateWelcomeEmail({ userName: user.firstName || 'Client' }),
      });

      return result.success;
    } catch (error) {
      this.logger.error('Failed to send welcome email', error);
      return false;
    }
  }

  /**
   * Send payment receipt
   */
  async sendPaymentReceipt(userId: string, reservationId: string, amount: number): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.email) return false;

      const result = await this.oneSignalService.sendEmail({
        to: user.email,
        subject: `Reçu de paiement - KADOOR SERVICE`,
        body: this.generatePaymentReceiptEmail({
          userName: user.firstName || 'Client',
          amount,
          bookingRef: reservationId.slice(-8).toUpperCase(),
          date: new Date().toLocaleDateString('fr-FR'),
        }),
      });

      return result.success;
    } catch (error) {
      this.logger.error('Failed to send payment receipt', error);
      return false;
    }
  }

  /**
   * Send newsletter to all subscribers
   */
  async sendNewsletter(subject: string, content: string): Promise<{ sent: number; failed: number }> {
    const subscribers = await this.prisma.newsletter.findMany({
      where: { isActive: true },
    });

    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
      const result = await this.oneSignalService.sendEmail({
        to: subscriber.email,
        subject,
        body: content,
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  }

  // Email template generators
  private generateReservationConfirmationEmail(data: {
    userName: string;
    itemTitle: string;
    itemType: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    bookingRef: string;
  }): string {
    return `
      <html>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
          <div style="background: #b91c1c; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">KADOOR SERVICE</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #333;">Confirmation de réservation</h2>
            <p>Bonjour ${data.userName},</p>
            <p>Votre réservation a été confirmée avec succès !</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Référence:</strong> ${data.bookingRef}</p>
              <p><strong>${data.itemType}:</strong> ${data.itemTitle}</p>
              <p><strong>Du:</strong> ${data.startDate}</p>
              <p><strong>Au:</strong> ${data.endDate}</p>
              <p style="font-size: 18px; color: #b91c1c;"><strong>Total:</strong> ${data.totalPrice.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <p>Merci pour votre confiance !</p>
            <p>L'équipe KADOOR SERVICE</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateCancellationEmail(data: { userName: string; itemTitle: string; bookingRef: string }): string {
    return `
      <html>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
          <div style="background: #b91c1c; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">KADOOR SERVICE</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #333;">Annulation de réservation</h2>
            <p>Bonjour ${data.userName},</p>
            <p>Votre réservation <strong>#${data.bookingRef}</strong> pour <strong>${data.itemTitle}</strong> a été annulée.</p>
            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            <p>L'équipe KADOOR SERVICE</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeEmail(data: { userName: string }): string {
    return `
      <html>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
          <div style="background: #b91c1c; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">KADOOR SERVICE</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #333;">Bienvenue !</h2>
            <p>Bonjour ${data.userName},</p>
            <p>Bienvenue chez KADOOR SERVICE ! Nous sommes ravis de vous compter parmi nos clients.</p>
            <p>Découvrez notre gamme de véhicules et d'appartements disponibles à la location.</p>
            <p>L'équipe KADOOR SERVICE</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePaymentReceiptEmail(data: { userName: string; amount: number; bookingRef: string; date: string }): string {
    return `
      <html>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
          <div style="background: #b91c1c; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">KADOOR SERVICE</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #333;">Reçu de paiement</h2>
            <p>Bonjour ${data.userName},</p>
            <p>Nous avons bien reçu votre paiement.</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Référence:</strong> ${data.bookingRef}</p>
              <p><strong>Date:</strong> ${data.date}</p>
              <p style="font-size: 18px; color: #28a745;"><strong>Montant payé:</strong> ${data.amount.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <p>Merci pour votre confiance !</p>
            <p>L'équipe KADOOR SERVICE</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
