"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
const handlebars = __importStar(require("handlebars"));
let EmailService = class EmailService {
    configService;
    transporter;
    constructor(configService) {
        this.configService = configService;
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('SMTP_HOST', 'smtp.ethereal.email'),
            port: this.configService.get('SMTP_PORT', 587),
            secure: false,
            auth: {
                user: this.configService.get('SMTP_USER', ''),
                pass: this.configService.get('SMTP_PASS', ''),
            },
        });
    }
    async sendReservationConfirmation(booking, userEmail) {
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
    async sendPaymentConfirmation(booking, userEmail) {
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
    async sendContract(booking, userEmail, contractBuffer) {
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
    async sendIncidentAcknowledgement(incident) {
        const subject = 'Accusé de réception - Déclaration d\'incident - KADOOR SERVICE';
        const template = this.getEmailTemplate('incident-acknowledgement');
        const typeLabels = {
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
    async sendEmail(to, subject, html, attachments) {
        const mailOptions = {
            from: this.configService.get('EMAIL_FROM', 'noreply@kadoorservice.com'),
            to,
            subject,
            html,
            attachments,
        };
        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email envoyé:', info.messageId);
        }
        catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
        }
    }
    getEmailTemplate(templateName) {
        const templates = {
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
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map