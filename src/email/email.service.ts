import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OneSignalService } from '../notifications/onesignal.service';
import * as handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromName: string;
  private readonly fromAddress: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly oneSignalService: OneSignalService,
    private readonly configService: ConfigService,
  ) {
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 'KADOOR SERVICE';
    this.fromAddress = this.configService.get<string>('EMAIL_FROM_ADDRESS') || 'no-reply@kadoorservice.com';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  /**
   * Envoie un email de confirmation de réservation
   */
  async sendReservationConfirmation(booking: any, userEmail: string): Promise<void> {
    const subject = 'Confirmation de votre réservation - KADOOR SERVICE';
    const template = this.getEmailTemplate('reservation-confirmation');
    
    // URLs pour les documents téléchargeables
    const bookingPageUrl = `${this.frontendUrl}/fr/bookings/${booking.id}`;
    const logoUrl = `${this.configService.get<string>('BACKEND_URL') || 'http://localhost:4000'}/logo_kadoor_service.png`;
    
    const html = template({
      bookingId: booking.id,
      userName: `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() || 'Client',
      itemName: booking.vehicle?.title || booking.apartment?.title,
      itemType: booking.vehicle ? 'Véhicule' : 'Appartement',
      startDate: new Date(booking.startDate).toLocaleDateString('fr-FR'),
      endDate: new Date(booking.endDate).toLocaleDateString('fr-FR'),
      totalPrice: booking.totalPrice.toFixed(2),
      status: booking.status,
      logoUrl,
      invoiceUrl: `${bookingPageUrl}?download=invoice`,
      receiptUrl: `${bookingPageUrl}?download=receipt`,
      contractUrl: `${bookingPageUrl}?download=contract`,
    });

    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Envoie un email de confirmation de paiement
   */
  async sendPaymentConfirmation(booking: any, userEmail: string): Promise<void> {
    const subject = 'Confirmation de paiement - KADOOR SERVICE';
    const template = this.getEmailTemplate('payment-confirmation');
    const logoUrl = `${this.configService.get<string>('BACKEND_URL') || 'http://localhost:4000'}/logo_kadoor_service.png`;
    
    const html = template({
      bookingId: booking.id,
      userName: `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim() || 'Client',
      itemName: booking.vehicle?.title || booking.apartment?.title,
      totalPrice: booking.totalPrice.toFixed(2),
      paymentDate: new Date().toLocaleDateString('fr-FR'),
      logoUrl,
    });

    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Envoie un email avec lien vers le contrat
   * Note: OneSignal ne supporte pas les pièces jointes, on inclut un lien de téléchargement
   */
  async sendContract(booking: any, userEmail: string): Promise<void> {
    const subject = 'Votre contrat de location - KADOOR SERVICE';
    const template = this.getEmailTemplate('contract');
    const contractUrl = `${this.frontendUrl}/bookings/${booking.id}?download=contract`;
    const html = template({
      bookingId: booking.id,
      userName: `${booking.user.firstName || ''} ${booking.user.lastName || ''}`,
      itemName: booking.vehicle?.title || booking.apartment?.title,
      contractUrl,
    });

    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Envoie un email de bienvenue à un nouvel utilisateur
   */
  async sendWelcomeEmail(userEmail: string, firstName: string): Promise<void> {
    const subject = 'Bienvenue chez KADOOR SERVICE !';
    const template = this.getEmailTemplate('welcome');
    const html = template({ userName: firstName || 'Client' });
    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Envoie un email d'annulation de réservation
   */
  async sendCancellationEmail(booking: any, userEmail: string): Promise<void> {
    const subject = `Annulation de votre réservation #${booking.id?.slice(-8)?.toUpperCase() || ''} - KADOOR SERVICE`;
    const template = this.getEmailTemplate('cancellation');
    const html = template({
      userName: `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim() || 'Client',
      itemName: booking.vehicle?.title || booking.apartment?.title || 'Service',
      bookingRef: booking.id?.slice(-8)?.toUpperCase() || booking.id,
    });
    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   */
  async sendPasswordResetEmail(userEmail: string, userName: string, resetToken: string): Promise<void> {
    const subject = 'Réinitialisation de votre mot de passe - KADOOR SERVICE';
    const template = this.getEmailTemplate('password-reset');
    const resetUrl = `${this.frontendUrl}/fr/reset-password?token=${resetToken}`;
    const logoUrl = `${this.configService.get<string>('BACKEND_URL') || 'http://localhost:4000'}/logo_kadoor_service.png`;
    
    const html = template({
      userName: userName || 'Client',
      resetUrl,
      logoUrl,
      expirationTime: '1 heure',
    });

    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Envoie un accusé de réception pour une déclaration d'incident
   */
  async sendIncidentAcknowledgement(incident: any): Promise<void> {
    const subject = 'Accusé de réception - Déclaration d\'incident - KADOOR SERVICE';
    const template = this.getEmailTemplate('incident-acknowledgement');
    
    const typeLabels: Record<string, string> = {
      ACCIDENT: 'Accident',
      PANNE: 'Panne',
      SINISTRE: 'Sinistre',
      VOL: 'Vol',
      DOMMAGE: 'Dommage',
      AUTRES: 'Autres',
    };

    const html = template({
      incidentId: incident.id,
      userName: `${incident.firstName} ${incident.lastName}`,
      incidentType: typeLabels[incident.type] || incident.type,
      incidentTitle: incident.title,
      incidentDescription: incident.description,
      incidentLocation: incident.location || 'Non spécifié',
      incidentDate: incident.date ? new Date(incident.date).toLocaleDateString('fr-FR') : 'Non spécifié',
      declarationDate: new Date(incident.createdAt).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      vehicleInfo: incident.vehicle ? `Véhicule: ${incident.vehicle.title}` : null,
      apartmentInfo: incident.apartment ? `Appartement: ${incident.apartment.title}` : null,
    });

    await this.sendEmail(incident.email, subject, html);
  }

  /**
   * Envoie un email via OneSignal
   */
  private async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    preheader?: string,
  ): Promise<void> {
    const recipients = Array.isArray(to) ? to : [to];

    try {
      const result = await this.oneSignalService.sendEmail({
        includeEmailTokens: recipients,
        subject,
        body: html,
        fromName: this.fromName,
        fromAddress: this.fromAddress,
        preheader,
        includeUnsubscribed: true,
      });

      if (result) {
        this.logger.log(`Email sent: "${subject}" to ${recipients.join(', ')}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send email "${subject}" to ${recipients.join(', ')}`, error);
    }
  }

  /**
   * Récupère un template email
   */
  private getEmailTemplate(templateName: string): handlebars.TemplateDelegate {
    // Templates simples intégrés (en production, utiliser des fichiers séparés)
    const templates: Record<string, string> = {
      'reservation-confirmation': `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 4px solid #b91c1c; }
            .header img { max-width: 180px; height: auto; }
            .header h1 { color: #b91c1c; margin: 15px 0 0 0; font-size: 22px; }
            .content { padding: 30px; background-color: #ffffff; }
            .details-box { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .details-box h3 { margin-top: 0; color: #b91c1c; }
            .details-box ul { list-style: none; padding: 0; margin: 0; }
            .details-box li { padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
            .details-box li:last-child { border-bottom: none; }
            .documents-section { background-color: #fff8f8; border: 1px solid #f0d0d0; border-radius: 8px; padding: 20px; margin: 25px 0; }
            .documents-section h3 { margin-top: 0; color: #b91c1c; }
            .btn { display: inline-block; background-color: #b91c1c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 8px 8px 8px 0; font-weight: bold; }
            .btn:hover { background-color: #991b1b; }
            .btn-outline { background-color: #ffffff; color: #b91c1c; border: 2px solid #b91c1c; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="{{logoUrl}}" alt="KADOOR SERVICE" />
              <h1>Confirmation de Réservation</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>{{userName}}</strong>,</p>
              <p>Votre réservation a été confirmée avec succès ! Nous vous remercions de votre confiance.</p>
              
              <div class="details-box">
                <h3>Détails de la réservation</h3>
                <ul>
                  <li><strong>N° Réservation :</strong> {{bookingId}}</li>
                  <li><strong>{{itemType}} :</strong> {{itemName}}</li>
                  <li><strong>Période :</strong> Du {{startDate}} au {{endDate}}</li>
                  <li><strong>Montant total :</strong> {{totalPrice}} FCFA</li>
                  <li><strong>Statut :</strong> {{status}}</li>
                </ul>
              </div>

              <div class="documents-section">
                <h3>Vos documents</h3>
                <p>Téléchargez vos documents importants :</p>
                <a href="{{invoiceUrl}}" class="btn">Facture</a>
                <a href="{{receiptUrl}}" class="btn btn-outline">Reçu</a>
                <a href="{{contractUrl}}" class="btn btn-outline">Contrat</a>
              </div>

              <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
              <p style="margin-top: 30px;">Cordialement,<br><strong>L'équipe KADOOR SERVICE</strong></p>
            </div>
            <div class="footer">
              <p><strong>KADOOR SERVICE</strong></p>
              <p>Abidjan, Côte d'Ivoire</p>
              <p>Cet email est généré automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'payment-confirmation': `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 4px solid #b91c1c; }
            .header img { max-width: 180px; height: auto; }
            .header h1 { color: #b91c1c; margin: 15px 0 0 0; font-size: 22px; }
            .content { padding: 30px; background-color: #ffffff; }
            .details-box { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .details-box h3 { margin-top: 0; color: #b91c1c; }
            .details-box ul { list-style: none; padding: 0; margin: 0; }
            .details-box li { padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
            .details-box li:last-child { border-bottom: none; }
            .success-badge { background-color: #dcfce7; color: #166534; padding: 10px 20px; border-radius: 20px; display: inline-block; font-weight: bold; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="{{logoUrl}}" alt="KADOOR SERVICE" />
              <h1>Confirmation de Paiement</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>{{userName}}</strong>,</p>
              <p style="text-align: center;"><span class="success-badge">✓ Paiement reçu avec succès</span></p>
              
              <div class="details-box">
                <h3>Détails du paiement</h3>
                <ul>
                  <li><strong>N° Réservation :</strong> {{bookingId}}</li>
                  <li><strong>Service :</strong> {{itemName}}</li>
                  <li><strong>Montant payé :</strong> {{totalPrice}} FCFA</li>
                  <li><strong>Date de paiement :</strong> {{paymentDate}}</li>
                </ul>
              </div>

              <p>Merci pour votre confiance !</p>
              <p style="margin-top: 30px;">Cordialement,<br><strong>L'équipe KADOOR SERVICE</strong></p>
            </div>
            <div class="footer">
              <p><strong>KADOOR SERVICE</strong></p>
              <p>Abidjan, Côte d'Ivoire</p>
              <p>Cet email est généré automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      contract: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #b91c1c 0%, #d4af37 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #fff; border: 1px solid #e0e0e0; }
            .btn { display: inline-block; background: #b91c1c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background: #f8f9fa; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0">Votre Contrat de Location</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>{{userName}}</strong>,</p>
              <p>Votre contrat de location pour la réservation <strong>#{{bookingId}}</strong> est prêt.</p>
              <p><strong>Service :</strong> {{itemName}}</p>
              <p style="text-align:center"><a href="{{contractUrl}}" class="btn">Télécharger le contrat</a></p>
              <p>Merci de conserver ce document pour vos archives.</p>
            </div>
            <div class="footer">
              <p><strong>KADOOR SERVICE</strong> — Abidjan, Côte d'Ivoire</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'welcome': `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #b91c1c 0%, #d4af37 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #fff; border: 1px solid #e0e0e0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background: #f8f9fa; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body><div class="container">
          <div class="header"><h1 style="margin:0">KADOOR SERVICE</h1><p style="margin:8px 0 0">Bienvenue !</p></div>
          <div class="content">
            <p>Bonjour <strong>{{userName}}</strong>,</p>
            <p>Nous sommes ravis de vous accueillir chez <strong>KADOOR SERVICE</strong> !</p>
            <p>Vous pouvez dès maintenant explorer notre catalogue de véhicules et d'appartements disponibles à la location.</p>
            <p style="margin-top:24px">À très bientôt,<br><strong>L'équipe KADOOR SERVICE</strong></p>
          </div>
          <div class="footer"><p><strong>KADOOR SERVICE</strong> — Abidjan, Côte d'Ivoire</p></div>
        </div></body></html>
      `,
      'cancellation': `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #b91c1c; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #fff; border: 1px solid #e0e0e0; }
            .info-box { background: #fff5f5; border-left: 4px solid #b91c1c; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background: #f8f9fa; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body><div class="container">
          <div class="header"><h1 style="margin:0">Annulation de réservation</h1></div>
          <div class="content">
            <p>Bonjour <strong>{{userName}}</strong>,</p>
            <p>Nous vous informons que votre réservation a été annulée.</p>
            <div class="info-box">
              <p><strong>Référence :</strong> {{bookingRef}}</p>
              <p><strong>Service :</strong> {{itemName}}</p>
            </div>
            <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
            <p style="margin-top:24px">Cordialement,<br><strong>L'équipe KADOOR SERVICE</strong></p>
          </div>
          <div class="footer"><p><strong>KADOOR SERVICE</strong> — Abidjan, Côte d'Ivoire</p></div>
        </div></body></html>
      `,
      'incident-acknowledgement': `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #b91c1c 0%, #d4af37 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background-color: #ffffff; border: 1px solid #e0e0e0; }
            .info-box { background-color: #f8f9fa; border-left: 4px solid #b91c1c; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background-color: #f8f9fa; border-radius: 0 0 8px 8px; }
            .incident-id { background-color: #fff3cd; padding: 10px; border-radius: 4px; font-weight: bold; text-align: center; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Accusé de Réception</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Déclaration d'incident</p>
            </div>
            <div class="content">
              <p>Bonjour <strong>{{userName}}</strong>,</p>
              <p>Nous accusons réception de votre déclaration d'incident. Votre demande a été enregistrée et sera traitée dans les plus brefs délais.</p>
              
              <div class="incident-id">
                N° de référence : <strong>{{incidentId}}</strong>
              </div>

              <div class="info-box">
                <h3 style="margin-top: 0; color: #b91c1c;">Détails de l'incident :</h3>
                <p><strong>Type d'incident :</strong> {{incidentType}}</p>
                <p><strong>Titre :</strong> {{incidentTitle}}</p>
                <p><strong>Description :</strong> {{incidentDescription}}</p>
                <p><strong>Lieu :</strong> {{incidentLocation}}</p>
                <p><strong>Date de l'incident :</strong> {{incidentDate}}</p>
                {{#if vehicleInfo}}
                <p><strong>{{vehicleInfo}}</strong></p>
                {{/if}}
                {{#if apartmentInfo}}
                <p><strong>{{apartmentInfo}}</strong></p>
                {{/if}}
                <p><strong>Date de déclaration :</strong> {{declarationDate}}</p>
              </div>

              <p><strong>Prochaines étapes :</strong></p>
              <ul>
                <li>Notre équipe va examiner votre déclaration</li>
                <li>Vous serez contacté(e) dans les 24-48 heures</li>
                <li>Un suivi régulier vous sera communiqué</li>
              </ul>

              <p>En cas d'urgence, n'hésitez pas à nous contacter directement.</p>
              
              <p style="margin-top: 30px;">Cordialement,<br><strong>L'équipe KADOOR SERVICE</strong></p>
            </div>
            <div class="footer">
              <p><strong>KADOOR SERVICE</strong></p>
              <p>Cet email est généré automatiquement, merci de ne pas y répondre.</p>
              <p>Pour toute question, contactez-nous via notre site web ou par téléphone.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      'password-reset': `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 4px solid #b91c1c; }
            .header img { max-width: 180px; height: auto; }
            .header h1 { color: #b91c1c; margin: 15px 0 0 0; font-size: 22px; }
            .content { padding: 30px; background-color: #ffffff; }
            .btn { display: inline-block; background-color: #b91c1c; color: #ffffff !important; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .btn:hover { background-color: #991b1b; }
            .warning-box { background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 15px; margin: 20px 0; }
            .warning-box p { margin: 0; color: #856404; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="{{logoUrl}}" alt="KADOOR SERVICE" />
              <h1>Réinitialisation du mot de passe</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>{{userName}}</strong>,</p>
              <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
              
              <div style="text-align: center;">
                <a href="{{resetUrl}}" class="btn">Réinitialiser mon mot de passe</a>
              </div>

              <div class="warning-box">
                <p><strong>⚠️ Important :</strong> Ce lien expire dans <strong>{{expirationTime}}</strong>.</p>
              </div>

              <p>Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email. Votre mot de passe restera inchangé.</p>
              
              <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; color: #666; font-size: 12px;">{{resetUrl}}</p>
              
              <p style="margin-top: 30px;">Cordialement,<br><strong>L'équipe KADOOR SERVICE</strong></p>
            </div>
            <div class="footer">
              <p><strong>KADOOR SERVICE</strong></p>
              <p>Cet email est généré automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const templateContent = templates[templateName] || templates['reservation-confirmation'];
    return handlebars.compile(templateContent);
  }
}
