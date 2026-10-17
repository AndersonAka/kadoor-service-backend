import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import {
  drawAmountBanner,
  drawDocumentTitle,
  drawItemsTable,
  drawMetaRows,
  drawPartiesColumns,
  drawPayOnlineButton,
  drawPaymentHistory,
  drawTopBar,
  drawTotalsStack,
  formatAmountFcfa,
  formatDateFrLong,
  formatDateFrShort,
  shortDocRef,
  stampFootersOnAllPages,
  type LineItemRow,
} from '../common/pdf/vercel-style-layout';

const STAFF_ROLES = ['ADMIN', 'MANAGER', 'COMMERCIAL'];

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  private assertOwnerOrStaff(booking: { userId: string }, requesterId: string, requesterRole: string) {
    if (booking.userId !== requesterId && !STAFF_ROLES.includes(requesterRole)) {
      throw new ForbiddenException("Vous n'avez pas accès à ce document");
    }
  }

  /** Contrat PDF réservé aux locations véhicule — pas pour les appartements. */
  private assertVehicleContract(booking: { vehicleId?: string | null; apartmentId?: string | null; vehicle?: unknown }) {
    if (booking.apartmentId || (!booking.vehicleId && !booking.vehicle)) {
      throw new BadRequestException(
        "Aucun contrat n'est délivré pour une réservation d'appartement.",
      );
    }
  }

  private bookingDays(booking: { startDate: Date; endDate: Date }) {
    return Math.max(
      1,
      Math.ceil(
        (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
  }

  private customerName(user: { firstName?: string | null; lastName?: string | null; email?: string | null }) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Client';
  }

  private periodLabel(booking: { startDate: Date; endDate: Date }) {
    return `${formatDateFrShort(booking.startDate)} – ${formatDateFrShort(booking.endDate)}`;
  }

  private buildBookingLines(
    booking: any,
    vehicleDailyRate: number,
  ): { rows: LineItemRow[]; subtotal: number } {
    const days = this.bookingDays(booking);
    const rows: LineItemRow[] = [];
    let subtotal = 0;

    if (booking.vehicle) {
      const base =
        booking.mileagePackageCost != null
          ? Number(booking.mileagePackageCost)
          : vehicleDailyRate * days;
      const unit =
        days > 0
          ? booking.mileagePackageCost != null
            ? Number(booking.mileagePackageCost) / days
            : vehicleDailyRate
          : vehicleDailyRate;
      rows.push({
        description: `Location véhicule — ${booking.vehicle.title}`,
        subtitle: this.periodLabel(booking),
        qty: days,
        unitPrice: formatAmountFcfa(unit),
        amount: formatAmountFcfa(base),
      });
      subtotal += base;

      if (booking.hasInsurance && booking.insurancePrice) {
        rows.push({
          description: 'Assurance complémentaire',
          qty: 1,
          unitPrice: formatAmountFcfa(booking.insurancePrice),
          amount: formatAmountFcfa(booking.insurancePrice),
        });
        subtotal += Number(booking.insurancePrice);
      }
    } else if (booking.apartment) {
      const nightsPrice = Number(booking.apartment.pricePerNight) * days;
      rows.push({
        description: `Location appartement — ${booking.apartment.title}`,
        subtitle: this.periodLabel(booking),
        qty: days,
        unitPrice: formatAmountFcfa(booking.apartment.pricePerNight),
        amount: formatAmountFcfa(nightsPrice),
      });
      subtotal += nightsPrice;

      if (booking.cleaningFee && Number(booking.cleaningFee) > 0) {
        rows.push({
          description: 'Frais de nettoyage',
          qty: 1,
          unitPrice: formatAmountFcfa(booking.cleaningFee),
          amount: formatAmountFcfa(booking.cleaningFee),
        });
        subtotal += Number(booking.cleaningFee);
      }
    }

    if (booking.promoDiscount && Number(booking.promoDiscount) > 0) {
      const code = booking.promoCode ? ` (${booking.promoCode})` : '';
      rows.push({
        description: `Réduction code promo${code}`,
        qty: 1,
        unitPrice: `− ${formatAmountFcfa(booking.promoDiscount)}`,
        amount: `− ${formatAmountFcfa(booking.promoDiscount)}`,
      });
      subtotal -= Number(booking.promoDiscount);
    }

    // Garde-fou : le total enregistré reste la source de vérité affichée
    const total = Number(booking.totalPrice) || subtotal;
    if (rows.length === 0) {
      rows.push({
        description: 'Réservation Kadoor Service',
        subtitle: this.periodLabel(booking),
        qty: 1,
        unitPrice: formatAmountFcfa(total),
        amount: formatAmountFcfa(total),
      });
      return { rows, subtotal: total };
    }

    return { rows, subtotal: total };
  }

  async generateInvoice(bookingId: string, requesterId: string, requesterRole: string): Promise<Buffer> {
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
    this.assertOwnerOrStaff(booking, requesterId, requesterRole);

    let vehicleDailyRate = 0;
    if (booking.vehicle) {
      const rateRow = await this.prisma.vehicleTypePricing.findUnique({
        where: { vehicleType: booking.vehicle.type },
      });
      const tier =
        booking.mileagePackage === 'TIER2' || booking.mileagePackage === 'TIER3'
          ? booking.mileagePackage
          : 'TIER1';
      if (rateRow) {
        if (tier === 'TIER1') vehicleDailyRate = rateRow.tier1MileageDailyAmount;
        else if (tier === 'TIER2') vehicleDailyRate = rateRow.tier2MileageDailyAmount;
        else vehicleDailyRate = rateRow.tier3MileageDailyAmount;
      }
    }

    return this.createInvoicePDF(booking, vehicleDailyRate);
  }

  async generateContract(bookingId: string, requesterId: string, requesterRole: string): Promise<Buffer> {
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
    this.assertOwnerOrStaff(booking, requesterId, requesterRole);
    this.assertVehicleContract(booking);

    return this.createContractPDF(booking);
  }

  async generateReceipt(bookingId: string, requesterId: string, requesterRole: string): Promise<Buffer> {
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
    this.assertOwnerOrStaff(booking, requesterId, requesterRole);

    return this.createReceiptPDF(booking);
  }

  /**
   * Facture réservation — mise en page type Vercel, en français, marque Kadoor.
   */
  private createInvoicePDF(booking: any, vehicleDailyRate: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `Facture ${shortDocRef(booking.id)}`,
          Author: 'Kadoor Service',
          Subject: 'Facture de réservation',
          Creator: 'Kadoor Service',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const invoiceNumber = shortDocRef(booking.id);
      const issueDate = formatDateFrLong(booking.createdAt);
      const dueDate = formatDateFrLong(booking.startDate);
      const total = Number(booking.totalPrice) || 0;
      const isPaid = ['CONFIRMED', 'COMPLETED'].includes(booking.status);
      const { rows, subtotal } = this.buildBookingLines(booking, vehicleDailyRate);

      const billToLines: string[] = [];
      if (booking.user?.address) billToLines.push(booking.user.address);
      billToLines.push('Côte d\'Ivoire');

      drawTopBar(doc);
      let y = drawDocumentTitle(doc, 'Facture');
      y = drawMetaRows(
        doc,
        [
          { label: 'N° de facture', value: invoiceNumber },
          { label: "Date d'émission", value: issueDate },
          { label: "Date d'échéance", value: dueDate },
        ],
        y,
      );

      y = drawPartiesColumns(
        doc,
        {
          name: this.customerName(booking.user),
          lines: billToLines,
          email: booking.user?.email,
          phone: booking.user?.phone,
        },
        y,
      );

      const banner = isPaid
        ? `${formatAmountFcfa(total)} payé`
        : `${formatAmountFcfa(total)} à payer le ${dueDate}`;
      y = drawAmountBanner(doc, banner, y);

      if (!isPaid) {
        const payUrl = process.env.WEB_APP_URL
          ? `${process.env.WEB_APP_URL.replace(/\/$/, '')}/bookings/${booking.id}`
          : null;
        y = drawPayOnlineButton(doc, 'Payer en ligne', payUrl, y);
      } else {
        y += 6;
      }

      y = drawItemsTable(doc, rows, y);
      y = drawTotalsStack(
        doc,
        [
          { label: 'Sous-total', value: formatAmountFcfa(subtotal) },
          { label: 'Total', value: formatAmountFcfa(total), emphasize: true },
          {
            label: isPaid ? 'Montant payé' : 'Montant dû',
            value: `${formatAmountFcfa(total)}${isPaid ? '' : ''}`,
            emphasize: true,
          },
        ],
        y,
      );

      stampFootersOnAllPages(doc);
      doc.end();
    });
  }

  private async createContractPDF(booking: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('CONTRAT DE LOCATION', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`N° Contrat: ${booking.id}`, { align: 'right' });
      doc.text(`Date: ${new Date(booking.createdAt).toLocaleDateString('fr-FR')}`, {
        align: 'right',
      });
      doc.moveDown();

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

      doc.fontSize(14).text('PÉRIODE', { underline: true });
      doc.fontSize(10);
      doc.text(
        `Du ${new Date(booking.startDate).toLocaleDateString('fr-FR')} au ${new Date(booking.endDate).toLocaleDateString('fr-FR')}`,
      );
      doc.moveDown();

      doc.fontSize(14).text('MONTANT', { underline: true });
      doc.fontSize(10);
      doc.text(`Montant total: ${booking.totalPrice.toFixed(2)} FCFA`);
      doc.moveDown();

      doc.fontSize(14).text('CONDITIONS GÉNÉRALES', { underline: true });
      doc.fontSize(10);
      doc.text("1. Le locataire s'engage à utiliser le bien loué conformément à sa destination.");
      doc.text('2. Le locataire est responsable des dommages causés au bien loué.');
      doc.text('3. Le paiement doit être effectué avant le début de la location.');
      doc.text('4. Toute annulation doit être effectuée selon les conditions prévues.');
      doc.moveDown();

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
   * Reçu de paiement — même modèle Vercel, section historique des paiements.
   */
  private createReceiptPDF(booking: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `Reçu ${shortDocRef(booking.id, 'R')}`,
          Author: 'Kadoor Service',
          Subject: 'Reçu de paiement',
          Creator: 'Kadoor Service',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const invoiceNumber = shortDocRef(booking.id);
      const receiptNumber = shortDocRef(booking.id, 'R');
      const paidAt = booking.updatedAt || booking.createdAt;
      const paidDate = formatDateFrLong(paidAt);
      const total = Number(booking.totalPrice) || 0;
      const { rows, subtotal } = this.buildBookingLines(booking, 0);

      const billToLines: string[] = [];
      if (booking.user?.address) billToLines.push(booking.user.address);
      billToLines.push('Côte d\'Ivoire');

      drawTopBar(doc);
      let y = drawDocumentTitle(doc, 'Reçu');
      y = drawMetaRows(
        doc,
        [
          { label: 'N° de facture', value: invoiceNumber },
          { label: 'N° de reçu', value: receiptNumber },
          { label: 'Date de paiement', value: paidDate },
        ],
        y,
      );

      y = drawPartiesColumns(
        doc,
        {
          name: this.customerName(booking.user),
          lines: billToLines,
          email: booking.user?.email,
          phone: booking.user?.phone,
        },
        y,
      );

      y = drawAmountBanner(doc, `${formatAmountFcfa(total)} payé le ${paidDate}`, y);
      y += 8;

      y = drawItemsTable(doc, rows, y);
      y = drawTotalsStack(
        doc,
        [
          { label: 'Sous-total', value: formatAmountFcfa(subtotal) },
          { label: 'Total', value: formatAmountFcfa(total), emphasize: true },
          { label: 'Montant payé', value: formatAmountFcfa(total), emphasize: true },
        ],
        y,
      );

      const method = booking.paymentReference
        ? `GeniusPay — ${booking.paymentReference}`
        : 'GeniusPay';

      y = drawPaymentHistory(
        doc,
        [
          {
            method,
            date: paidDate,
            amount: formatAmountFcfa(total),
            receiptNumber,
          },
        ],
        y,
      );

      stampFootersOnAllPages(doc);
      doc.end();
    });
  }
}
