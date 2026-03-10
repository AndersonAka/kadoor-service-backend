import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OneSignalService } from './onesignal.service';
import { PrismaService } from '../prisma/prisma.service';

export enum NotificationType {
  RESERVATION_CONFIRMED = 'reservation_confirmed',
  RESERVATION_CANCELLED = 'reservation_cancelled',
  PAYMENT_SUCCESS = 'payment_success',
  NEW_MESSAGE = 'new_message',
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly fromName: string;
  private readonly fromAddress: string;

  constructor(
    private readonly oneSignalService: OneSignalService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 'KADOOR SERVICE';
    this.fromAddress = this.configService.get<string>('EMAIL_FROM_ADDRESS') || 'no-reply@kadoorservice.com';
  }

  /**
   * Send reservation confirmation (email + push)
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

      // Send email
      await this.oneSignalService.sendEmail({
        includeEmailTokens: [user.email],
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
        fromName: this.fromName,
        fromAddress: this.fromAddress,
        includeUnsubscribed: true,
      });

      // Send push notification
      await this.oneSignalService.sendPush({
        includeAliases: { external_id: [userId] },
        contents: { fr: `Votre réservation pour ${item?.title} a été confirmée.`, en: `Your reservation for ${item?.title} has been confirmed.` },
        headings: { fr: 'Réservation confirmée', en: 'Reservation confirmed' },
        data: { reservationId, type: NotificationType.RESERVATION_CONFIRMED },
      });

      return true;
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

      await this.oneSignalService.sendEmail({
        includeEmailTokens: [user.email],
        subject: `Annulation de réservation #${reservationId.slice(-8)}`,
        body: this.generateCancellationEmail({
          userName: user.firstName || 'Client',
          itemTitle: item?.title || 'Service',
          bookingRef: reservationId.slice(-8).toUpperCase(),
        }),
        fromName: this.fromName,
        fromAddress: this.fromAddress,
        includeUnsubscribed: true,
      });

      return true;
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
      await this.oneSignalService.createOrUpdateUser({
        externalId: userId,
        email: user.email,
        tags: { firstName: user.firstName || '', lastName: user.lastName || '', role: user.role },
      });

      await this.oneSignalService.sendEmail({
        includeEmailTokens: [user.email],
        subject: 'Bienvenue chez KADOOR SERVICE',
        body: this.generateWelcomeEmail({ userName: user.firstName || 'Client' }),
        fromName: this.fromName,
        fromAddress: this.fromAddress,
        includeUnsubscribed: true,
      });

      return true;
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

      await this.oneSignalService.sendEmail({
        includeEmailTokens: [user.email],
        subject: 'Reçu de paiement - KADOOR SERVICE',
        body: this.generatePaymentReceiptEmail({
          userName: user.firstName || 'Client',
          amount,
          bookingRef: reservationId.slice(-8).toUpperCase(),
          date: new Date().toLocaleDateString('fr-FR'),
        }),
        fromName: this.fromName,
        fromAddress: this.fromAddress,
        includeUnsubscribed: true,
      });

      return true;
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

    if (subscribers.length === 0) return { sent: 0, failed: 0 };

    const emails = subscribers.map((s) => s.email);
    const result = await this.oneSignalService.sendEmail({
      includeEmailTokens: emails,
      subject,
      body: content,
      fromName: this.fromName,
      fromAddress: this.fromAddress,
      includeUnsubscribed: true,
    });

    return result ? { sent: emails.length, failed: 0 } : { sent: 0, failed: emails.length };
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
