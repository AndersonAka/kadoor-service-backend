import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Configuration du transporteur email
    // Pour le développement, utiliser un service comme Ethereal Email ou Mailtrap
    // Pour la production, utiliser SendGrid, Mailgun, ou SMTP
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.ethereal.email'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false, // true pour 465, false pour autres ports
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
    });
  }

  /**
   * Envoie un email de confirmation de réservation
   */
  async sendReservationConfirmation(booking: any, userEmail: string): Promise<void> {
    const subject = 'Confirmation de votre réservation - KADOOR SERVICE';
    const template = this.getEmailTemplate('reservation-confirmation');
    const html = template({
      bookingId: booking.id,
      userName: `${booking.user.firstName || ''} ${booking.user.lastName || ''}`,
      itemName: booking.vehicle?.title || booking.apartment?.title,
      itemType: booking.vehicle ? 'véhicule' : 'appartement',
      startDate: new Date(booking.startDate).toLocaleDateString('fr-FR'),
      endDate: new Date(booking.endDate).toLocaleDateString('fr-FR'),
      totalPrice: booking.totalPrice.toFixed(2),
      status: booking.status,
    });

    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Envoie un email de confirmation de paiement
   */
  async sendPaymentConfirmation(booking: any, userEmail: string): Promise<void> {
    const subject = 'Confirmation de paiement - KADOOR SERVICE';
    const template = this.getEmailTemplate('payment-confirmation');
    const html = template({
      bookingId: booking.id,
      userName: `${booking.user.firstName || ''} ${booking.user.lastName || ''}`,
      itemName: booking.vehicle?.title || booking.apartment?.title,
      totalPrice: booking.totalPrice.toFixed(2),
      paymentDate: new Date().toLocaleDateString('fr-FR'),
    });

    await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Envoie un email avec le contrat en pièce jointe
   */
  async sendContract(booking: any, userEmail: string, contractBuffer: Buffer): Promise<void> {
    const subject = 'Votre contrat de location - KADOOR SERVICE';
    const template = this.getEmailTemplate('contract');
    const html = template({
      bookingId: booking.id,
      userName: `${booking.user.firstName || ''} ${booking.user.lastName || ''}`,
      itemName: booking.vehicle?.title || booking.apartment?.title,
    });

    await this.sendEmail(userEmail, subject, html, [
      {
        filename: `contrat-${booking.id}.pdf`,
        content: contractBuffer,
      },
    ]);
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
   * Envoie un email générique
   */
  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    attachments?: Array<{ filename: string; content: Buffer }>,
  ): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM', 'noreply@kadoorservice.com'),
      to,
      subject,
      html,
      attachments,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email envoyé:', info.messageId);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      // En développement, ne pas faire échouer la requête si l'email échoue
      // En production, utiliser une queue (Bull/BullMQ) pour réessayer
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
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Confirmation de Réservation</h1>
            </div>
            <div class="content">
              <p>Bonjour {{userName}},</p>
              <p>Votre réservation a été confirmée avec succès !</p>
              <h3>Détails de la réservation :</h3>
              <ul>
                <li><strong>N° Réservation:</strong> {{bookingId}}</li>
                <li><strong>{{itemType}}:</strong> {{itemName}}</li>
                <li><strong>Période:</strong> {{startDate}} au {{endDate}}</li>
                <li><strong>Montant total:</strong> {{totalPrice}} FCFA</li>
                <li><strong>Statut:</strong> {{status}}</li>
              </ul>
              <p>Merci de votre confiance !</p>
            </div>
            <div class="footer">
              <p>KADOOR SERVICE</p>
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
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Confirmation de Paiement</h1>
            </div>
            <div class="content">
              <p>Bonjour {{userName}},</p>
              <p>Votre paiement a été reçu avec succès !</p>
              <h3>Détails du paiement :</h3>
              <ul>
                <li><strong>N° Réservation:</strong> {{bookingId}}</li>
                <li><strong>Service:</strong> {{itemName}}</li>
                <li><strong>Montant payé:</strong> {{totalPrice}} FCFA</li>
                <li><strong>Date de paiement:</strong> {{paymentDate}}</li>
              </ul>
              <p>Merci pour votre paiement !</p>
            </div>
            <div class="footer">
              <p>KADOOR SERVICE</p>
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
            .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Votre Contrat de Location</h1>
            </div>
            <div class="content">
              <p>Bonjour {{userName}},</p>
              <p>Veuillez trouver ci-joint votre contrat de location pour la réservation {{bookingId}}.</p>
              <p><strong>Service:</strong> {{itemName}}</p>
              <p>Merci de conserver ce document pour vos archives.</p>
            </div>
            <div class="footer">
              <p>KADOOR SERVICE</p>
              <p>Cet email est généré automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
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
    };

    const templateContent = templates[templateName] || templates['reservation-confirmation'];
    return handlebars.compile(templateContent);
  }
}
