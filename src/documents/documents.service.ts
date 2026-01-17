import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Génère une facture PDF pour une réservation
   */
  async generateInvoice(bookingId: string): Promise<Buffer> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        vehicle: true,
        apartment: true,
        user: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Réservation avec l'ID ${bookingId} non trouvée`);
    }

    return this.createInvoicePDF(booking);
  }

  /**
   * Génère un contrat PDF pour une réservation
   */
  async generateContract(bookingId: string): Promise<Buffer> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        vehicle: true,
        apartment: true,
        user: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Réservation avec l'ID ${bookingId} non trouvée`);
    }

    return this.createContractPDF(booking);
  }

  /**
   * Génère un reçu PDF pour une réservation
   */
  async generateReceipt(bookingId: string): Promise<Buffer> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        vehicle: true,
        apartment: true,
        user: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Réservation avec l'ID ${bookingId} non trouvée`);
    }

    return this.createReceiptPDF(booking);
  }

  /**
   * Crée le PDF de facture
   */
  private async createInvoicePDF(booking: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // En-tête
      doc.fontSize(20).text('FACTURE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`N° Facture: ${booking.id}`, { align: 'right' });
      doc.text(`Date: ${new Date(booking.createdAt).toLocaleDateString('fr-FR')}`, {
        align: 'right',
      });
      doc.moveDown();

      // Informations client
      doc.fontSize(14).text('Informations Client', { underline: true });
      doc.fontSize(10);
      doc.text(`Nom: ${booking.user.firstName || ''} ${booking.user.lastName || ''}`);
      doc.text(`Email: ${booking.user.email}`);
      if (booking.user.phone) {
        doc.text(`Téléphone: ${booking.user.phone}`);
      }
      doc.moveDown();

      // Détails de la réservation
      doc.fontSize(14).text('Détails de la Réservation', { underline: true });
      doc.fontSize(10);
      if (booking.vehicle) {
        doc.text(`Véhicule: ${booking.vehicle.title}`);
        doc.text(`Type: ${booking.vehicle.type}`);
        if (booking.vehicle.location) {
          doc.text(`Localisation: ${booking.vehicle.location}`);
        }
      } else if (booking.apartment) {
        doc.text(`Appartement: ${booking.apartment.title}`);
        doc.text(`Adresse: ${booking.apartment.address}`);
        doc.text(`Ville: ${booking.apartment.city}`);
      }
      doc.moveDown();

      // Période
      doc.text(
        `Période: ${new Date(booking.startDate).toLocaleDateString('fr-FR')} - ${new Date(booking.endDate).toLocaleDateString('fr-FR')}`,
      );
      const days = Math.ceil(
        (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      doc.text(`Durée: ${days} jour(s)`);
      doc.moveDown();

      // Montant
      doc.fontSize(14).text('Montant', { underline: true });
      doc.fontSize(10);
      if (booking.vehicle) {
        doc.text(`Prix par jour: ${booking.vehicle.pricePerDay.toFixed(2)} FCFA`);
        doc.text(`Nombre de jours: ${days}`);
      } else if (booking.apartment) {
        doc.text(`Prix par nuit: ${booking.apartment.pricePerNight.toFixed(2)} FCFA`);
        doc.text(`Nombre de nuits: ${days}`);
      }
      doc.moveDown();
      doc.fontSize(16).text(`Total: ${booking.totalPrice.toFixed(2)} FCFA`, {
        align: 'right',
      });
      doc.moveDown();

      // Statut
      doc.fontSize(10).text(`Statut: ${booking.status}`, { align: 'right' });

      // Pied de page
      doc.moveTo(50, doc.page.height - 50).lineTo(doc.page.width - 50, doc.page.height - 50).stroke();
      doc.fontSize(8).text('KADOOR SERVICE - Facture générée automatiquement', {
        align: 'center',
      });

      doc.end();
    });
  }

  /**
   * Crée le PDF de contrat
   */
  private async createContractPDF(booking: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // En-tête
      doc.fontSize(20).text('CONTRAT DE LOCATION', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`N° Contrat: ${booking.id}`, { align: 'right' });
      doc.text(`Date: ${new Date(booking.createdAt).toLocaleDateString('fr-FR')}`, {
        align: 'right',
      });
      doc.moveDown();

      // Parties
      doc.fontSize(14).text('PARTIES', { underline: true });
      doc.fontSize(10);
      doc.text('LOUEUR: KADOOR SERVICE');
      doc.moveDown();
      doc.text('LOCATAIRE:');
      doc.text(`Nom: ${booking.user.firstName || ''} ${booking.user.lastName || ''}`);
      doc.text(`Email: ${booking.user.email}`);
      if (booking.user.phone) {
        doc.text(`Téléphone: ${booking.user.phone}`);
      }
      doc.moveDown();

      // Objet
      doc.fontSize(14).text('OBJET', { underline: true });
      doc.fontSize(10);
      if (booking.vehicle) {
        doc.text(`Location du véhicule: ${booking.vehicle.title}`);
        doc.text(`Type: ${booking.vehicle.type}`);
      } else if (booking.apartment) {
        doc.text(`Location de l'appartement: ${booking.apartment.title}`);
        doc.text(`Adresse: ${booking.apartment.address}, ${booking.apartment.city}`);
      }
      doc.moveDown();

      // Période
      doc.fontSize(14).text('PÉRIODE', { underline: true });
      doc.fontSize(10);
      doc.text(
        `Du ${new Date(booking.startDate).toLocaleDateString('fr-FR')} au ${new Date(booking.endDate).toLocaleDateString('fr-FR')}`,
      );
      doc.moveDown();

      // Montant
      doc.fontSize(14).text('MONTANT', { underline: true });
      doc.fontSize(10);
      doc.text(`Montant total: ${booking.totalPrice.toFixed(2)} FCFA`);
      doc.moveDown();

      // Conditions générales
      doc.fontSize(14).text('CONDITIONS GÉNÉRALES', { underline: true });
      doc.fontSize(10);
      doc.text('1. Le locataire s\'engage à utiliser le bien loué conformément à sa destination.');
      doc.text('2. Le locataire est responsable des dommages causés au bien loué.');
      doc.text('3. Le paiement doit être effectué avant le début de la location.');
      doc.text('4. Toute annulation doit être effectuée selon les conditions prévues.');
      doc.moveDown();

      // Signature
      doc.moveDown();
      doc.text('Signature du locataire:', { underline: true });
      doc.moveDown(3);
      doc.text('_________________________');
      doc.moveDown();
      doc.text('Signature du loueur:', { underline: true });
      doc.moveDown(3);
      doc.text('_________________________');

      doc.end();
    });
  }

  /**
   * Crée le PDF de reçu
   */
  private async createReceiptPDF(booking: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // En-tête
      doc.fontSize(20).text('REÇU DE PAIEMENT', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`N° Reçu: ${booking.id}`, { align: 'right' });
      doc.text(`Date: ${new Date(booking.createdAt).toLocaleDateString('fr-FR')}`, {
        align: 'right',
      });
      doc.moveDown();

      // Informations
      doc.fontSize(10);
      doc.text(`Reçu de: ${booking.user.firstName || ''} ${booking.user.lastName || ''}`);
      doc.text(`Email: ${booking.user.email}`);
      doc.moveDown();

      if (booking.vehicle) {
        doc.text(`Pour: Location véhicule - ${booking.vehicle.title}`);
      } else if (booking.apartment) {
        doc.text(`Pour: Location appartement - ${booking.apartment.title}`);
      }
      doc.moveDown();

      // Montant
      doc.fontSize(16).text(`Montant reçu: ${booking.totalPrice.toFixed(2)} FCFA`, {
        align: 'center',
      });
      doc.moveDown();

      // Statut
      doc.fontSize(10).text(`Statut: ${booking.status}`, { align: 'right' });

      // Pied de page
      doc.moveTo(50, doc.page.height - 50).lineTo(doc.page.width - 50, doc.page.height - 50).stroke();
      doc.fontSize(8).text('KADOOR SERVICE - Reçu généré automatiquement', {
        align: 'center',
      });

      doc.end();
    });
  }
}
