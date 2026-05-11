import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../reservations/paystack.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

/**
 * Résout le chemin d'un asset (logo, etc.) que NestJS copie dans `dist/assets/`
 * en production via `nest-cli.json` et qui reste sous `backend/src/assets/` en dev.
 */
function resolveAssetPath(filename: string): string | null {
  const candidates = [
    path.join(__dirname, '..', 'assets', filename), // dist/<module>/file → ../assets
    path.join(__dirname, '..', '..', 'assets', filename), // dist/<module>/sub → ../../assets
    path.join(process.cwd(), 'src', 'assets', filename), // dev runtime
    path.join(process.cwd(), 'dist', 'assets', filename), // build runtime
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Formate un nombre en FR sans utiliser les espaces insécables (U+00A0 / U+202F)
 * que la fonte par défaut de PDFKit (Helvetica WinAnsi) ne sait pas rendre
 * correctement et affiche comme "/".
 */
function formatNumberFr(n: number): string {
  return Number(n || 0)
    .toLocaleString('fr-FR', { maximumFractionDigits: 0 })
    .replace(/[\u00A0\u202F]/g, ' ');
}

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private paystackService: PaystackService,
    private configService: ConfigService,
  ) {}

  private buildReference(): string {
    return `INV-${Date.now().toString().slice(-8)}`;
  }

  private toAmount(lines: Array<{ quantity: number; unitPrice: number }>, taxAmount = 0) {
    const subtotal = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitPrice), 0);
    const totalAmount = subtotal + Number(taxAmount || 0);
    return { subtotal, totalAmount };
  }

  private invoiceInclude = {
    booking: true,
    user: { select: { id: true, email: true, firstName: true, lastName: true } },
    lines: true,
  };

  async create(adminId: string, dto: CreateInvoiceDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { user: true },
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    if (!booking.userId) throw new BadRequestException('Réservation sans client');

    const { subtotal, totalAmount } = this.toAmount(dto.lines, dto.taxAmount || 0);
    const reference = this.buildReference();

    return this.prisma.invoice.create({
      data: {
        reference,
        bookingId: booking.id,
        userId: booking.userId,
        createdById: adminId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        taxAmount: dto.taxAmount || 0,
        subtotal,
        totalAmount,
        internalNote: dto.internalNote,
        customerNote: dto.customerNote,
        lines: {
          create: dto.lines.map((l) => ({
            category: l.category,
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: Number(l.quantity) * Number(l.unitPrice),
          })),
        },
      },
      include: this.invoiceInclude,
    });
  }

  async findAllAdmin(status?: InvoiceStatus) {
    return this.prisma.invoice.findMany({
      where: status ? { status } : {},
      include: this.invoiceInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneAdmin(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, include: this.invoiceInclude });
    if (!invoice) throw new NotFoundException('Facture introuvable');
    return invoice;
  }

  async updateDraft(id: string, dto: UpdateInvoiceDto) {
    const existing = await this.findOneAdmin(id);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Seules les factures en brouillon sont modifiables');
    }

    const lines = dto.lines || existing.lines;
    const { subtotal, totalAmount } = this.toAmount(lines, dto.taxAmount ?? existing.taxAmount);

    return this.prisma.invoice.update({
      where: { id },
      data: {
        dueAt: dto.dueAt ? new Date(dto.dueAt) : existing.dueAt,
        taxAmount: dto.taxAmount ?? existing.taxAmount,
        subtotal,
        totalAmount,
        internalNote: dto.internalNote ?? existing.internalNote,
        customerNote: dto.customerNote ?? existing.customerNote,
        lines: dto.lines
          ? {
              deleteMany: {},
              create: dto.lines.map((l) => ({
                category: l.category,
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                lineTotal: Number(l.quantity) * Number(l.unitPrice),
              })),
            }
          : undefined,
      },
      include: this.invoiceInclude,
    });
  }

  async send(id: string) {
    const invoice = await this.findOneAdmin(id);
    if (!invoice.lines.length) throw new BadRequestException('Facture vide');
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
      include: this.invoiceInclude,
    });
  }

  async markPaid(id: string) {
    const invoice = await this.findOneAdmin(id);
    if (invoice.status === 'CANCELLED') throw new BadRequestException('Facture annulée');
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
      include: this.invoiceInclude,
    });
  }

  async cancel(id: string) {
    const invoice = await this.findOneAdmin(id);
    if (invoice.status === 'PAID') throw new BadRequestException('Facture déjà payée');
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.invoiceInclude,
    });
  }

  async findMine(userId: string) {
    // Les brouillons (DRAFT) restent privés à l'administration tant qu'ils
    // n'ont pas été émis : on les exclut systématiquement de la vue client.
    return this.prisma.invoice.findMany({
      where: {
        userId,
        status: { not: 'DRAFT' },
      },
      include: this.invoiceInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMineOne(userId: string, id: string) {
    const invoice = await this.findOneAdmin(id);
    if (invoice.userId !== userId) throw new ForbiddenException('Accès refusé');
    // Une facture en brouillon n'est pas censée exister côté client : on
    // renvoie 404 (et non 403) pour ne pas divulguer son existence.
    if (invoice.status === 'DRAFT') {
      throw new NotFoundException('Facture introuvable');
    }
    return invoice;
  }

  async initiatePayment(userId: string, userEmail: string, id: string) {
    const invoice = await this.findMineOne(userId, id);
    if (!['SENT', 'OVERDUE'].includes(invoice.status)) {
      throw new BadRequestException('Facture non payable');
    }

    const paystackReference = `INV-${invoice.id}-${Date.now()}`;
    const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
    const locale = this.configService.get<string>('WEB_APP_DEFAULT_LOCALE') || 'fr';
    const callback = `${webAppUrl}/${locale}/payment/callback?invoiceId=${invoice.id}`;

    const result = await this.paystackService.initializeTransaction({
      email: userEmail,
      amount: invoice.totalAmount,
      reference: paystackReference,
      callback_url: callback,
      metadata: { invoiceId: invoice.id, type: 'invoice' },
    });

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { paystackReference },
    });

    return { paymentUrl: result.authorization_url, reference: paystackReference };
  }

  async verifyPayment(userId: string, id: string) {
    const invoice = await this.findMineOne(userId, id);
    if (!invoice.paystackReference) throw new BadRequestException('Référence de paiement absente');

    const verification = await this.paystackService.verifyTransaction(invoice.paystackReference);
    if (verification.status === 'success') {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', paidAt: new Date() },
      });
      return { status: 'success' };
    }
    return { status: verification.status };
  }

  async handleWebhook(signature: string, rawBody: string, body: any) {
    const isValid = this.paystackService.validateWebhookSignature(signature, rawBody);
    if (!isValid) return { status: 'error', message: 'Invalid signature' };
    if (body?.event !== 'charge.success') return { status: 'ok' };
    const reference = body?.data?.reference;
    if (!reference) return { status: 'ok' };

    const invoice = await this.prisma.invoice.findFirst({ where: { paystackReference: reference } });
    if (!invoice) return { status: 'ok' };
    if (invoice.status === 'PAID') return { status: 'ok' };

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    return { status: 'ok' };
  }

  /**
   * Génère un PDF "premium" de la facture, conforme à la charte Kadoor.
   * - Header brand (logo vectoriel rouge + nom)
   * - Blocs émetteur / destinataire
   * - Tableau des lignes paginé (en-têtes répétés)
   * - Bloc total surligné rouge Kadoor
   * - Notes & footer avec numérotation
   */
  async generateInvoicePdf(id: string) {
    const invoice = await this.findOneAdmin(id);
    const currency = invoice.currency || 'FCFA';

    // Charte
    const COLORS = {
      brand: '#c21c21',
      brandDark: '#8a1418',
      brandSoft: '#fdecec',
      text: '#1f2937',
      textMuted: '#6b7280',
      border: '#e5e7eb',
      rowAlt: '#fafafa',
      success: '#059669',
      warning: '#d97706',
      gray: '#9ca3af',
    } as const;

    const STATUS_LABELS: Record<string, { label: string; color: string }> = {
      DRAFT: { label: 'Brouillon', color: COLORS.textMuted },
      SENT: { label: 'Envoyée', color: '#2563eb' },
      PAID: { label: 'Payée', color: COLORS.success },
      OVERDUE: { label: 'En retard', color: COLORS.warning },
      CANCELLED: { label: 'Annulée', color: '#dc2626' },
      DISPUTED: { label: 'Contestée', color: '#9333ea' },
    };

    const CATEGORY_LABELS: Record<string, string> = {
      DAMAGE: 'Dommage',
      LATE_RETURN: 'Retour en retard',
      MILEAGE_OVERAGE: 'Dépassement km',
      TRAFFIC_FINE: 'Amende routière',
      CLEANING: 'Nettoyage',
      OTHER: 'Autre',
    };

    const fmtAmount = (n: number) => `${formatNumberFr(n)} ${currency}`;
    const fmtDate = (d: Date | string | null | undefined) => {
      if (!d) return '—';
      const date = d instanceof Date ? d : new Date(d);
      if (Number.isNaN(date.getTime())) return '—';
      return date
        .toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        .replace(/[\u00A0\u202F]/g, ' ');
    };

    const logoPath = resolveAssetPath('logo_kadoor_service.png');

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
        info: {
          Title: `Facture ${invoice.reference}`,
          Author: 'KADOOR SERVICE',
          Subject: `Facture ${invoice.reference}`,
          Creator: 'KADOOR SERVICE - Plateforme',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 50;
      const contentWidth = pageWidth - margin * 2;

      /* ========== Helpers de rendu ========== */

      // Dimensions cibles du logo paysage Kadoor (déjà avec le wordmark "Kadoor Services")
      const LOGO_BOX_W = 120;
      const LOGO_BOX_H = 56;

      const drawBrandLogo = (x: number, y: number) => {
        if (logoPath) {
          // Vrai logo PNG paysage (ratio préservé via fit, le logo contient déjà le wordmark)
          try {
            doc.image(logoPath, x, y, { fit: [LOGO_BOX_W, LOGO_BOX_H] });
            return;
          } catch {
            /* fallback ci-dessous */
          }
        }
        // Fallback : pastille rouge "Kadoor"
        doc.save();
        doc.roundedRect(x, y + 8, 110, 40, 8).fill(COLORS.brand);
        doc
          .fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(18)
          .text('KADOOR', x, y + 18, { width: 110, align: 'center' });
        doc.restore();
      };

      /**
       * Tampon diagonal en filigrane (PAYÉE / ANNULÉE) au centre de la page.
       * Donne une signature visuelle "très pro" sans alourdir le contenu.
       */
      const drawStatusWatermark = () => {
        if (!['PAID', 'CANCELLED'].includes(invoice.status)) return;
        const stampLabel = invoice.status === 'PAID' ? 'PAYÉE' : 'ANNULÉE';
        const stampColor = invoice.status === 'PAID' ? COLORS.success : '#dc2626';

        const cx = doc.page.width / 2;
        const cy = doc.page.height / 2;

        doc.save();
        doc.opacity(0.08);
        doc.translate(cx, cy);
        doc.rotate(-22);

        const label = stampLabel;
        doc.font('Helvetica-Bold').fontSize(110).fillColor(stampColor);
        const textW = doc.widthOfString(label);
        const textH = doc.heightOfString(label);

        // Cadre double trait
        const padX = 36;
        const padY = 18;
        const rectW = textW + padX * 2;
        const rectH = textH + padY * 2;
        doc
          .lineWidth(6)
          .strokeColor(stampColor)
          .roundedRect(-rectW / 2, -rectH / 2, rectW, rectH, 16)
          .stroke();
        doc
          .lineWidth(1.5)
          .roundedRect(-rectW / 2 + 8, -rectH / 2 + 8, rectW - 16, rectH - 16, 12)
          .stroke();

        doc.text(label, -textW / 2, -textH / 2 + 6, {
          lineBreak: false,
        });
        doc.opacity(1);
        doc.restore();
      };

      const drawDivider = (y: number) => {
        doc
          .save()
          .strokeColor(COLORS.border)
          .lineWidth(1)
          .moveTo(margin, y)
          .lineTo(margin + contentWidth, y)
          .stroke()
          .restore();
      };

      const drawStatusBadge = (
        x: number,
        y: number,
        statusKey: string,
      ): { width: number; height: number } => {
        const meta = STATUS_LABELS[statusKey] || { label: statusKey, color: COLORS.textMuted };
        const label = meta.label.toUpperCase();
        doc.font('Helvetica-Bold').fontSize(8);
        const padX = 8;
        const padY = 4;
        const textW = doc.widthOfString(label);
        const w = textW + padX * 2;
        const h = 16;
        doc.save();
        doc.roundedRect(x, y, w, h, h / 2).fill(meta.color);
        doc.fillColor('#ffffff').text(label, x + padX, y + padY);
        doc.restore();
        return { width: w, height: h };
      };

      const drawCategoryChip = (x: number, y: number, code: string) => {
        const label = CATEGORY_LABELS[code] || code;
        doc.font('Helvetica-Bold').fontSize(7.5);
        const textW = doc.widthOfString(label);
        const w = textW + 12;
        const h = 14;
        doc.save();
        doc
          .roundedRect(x, y, w, h, h / 2)
          .lineWidth(0.7)
          .strokeColor(COLORS.border)
          .fillAndStroke('#ffffff', COLORS.border);
        doc.fillColor(COLORS.text).text(label, x + 6, y + 3.5);
        doc.restore();
        return { width: w, height: h };
      };

      /* ========== Header avec bandeau brand ========== */

      const drawHeader = () => {
        // Bandeau rouge fin en haut de page (signature visuelle Kadoor)
        doc.save();
        doc.rect(0, 0, pageWidth, 6).fill(COLORS.brand);
        doc.restore();

        const headerTop = margin;

        // Bloc gauche : logo réel Kadoor (contient déjà "Kadoor Services") + tagline
        drawBrandLogo(margin, headerTop - 6);
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.textMuted)
          .text(
            "Côte d'Ivoire · Auto & Immobilier",
            margin,
            headerTop + LOGO_BOX_H - 2,
            {
              width: LOGO_BOX_W + 80,
            },
          );

        // Bloc droit : "FACTURE" + référence dans une carte douce alignée sur le logo
        const rightW = 220;
        const rightX = margin + contentWidth - rightW;
        const rightCardH = 56;
        doc.save();
        doc
          .roundedRect(rightX, headerTop - 4, rightW, rightCardH, 10)
          .fill(COLORS.brandSoft);
        doc.restore();
        doc
          .font('Helvetica-Bold')
          .fontSize(20)
          .fillColor(COLORS.brand)
          .text('FACTURE', rightX, headerTop + 6, {
            width: rightW - 14,
            align: 'right',
          });
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(COLORS.brandDark)
          .text(`N° ${invoice.reference}`, rightX, headerTop + 32, {
            width: rightW - 14,
            align: 'right',
          });

        drawDivider(headerTop + LOGO_BOX_H + 18);
      };

      /* ========== Métadonnées (dates + statut) ========== */

      const drawMetaBlock = (yStart: number): number => {
        const colW = contentWidth / 3;
        const labels = [
          { label: 'Émise le', value: fmtDate(invoice.issuedAt || invoice.createdAt) },
          { label: 'Échéance', value: invoice.dueAt ? fmtDate(invoice.dueAt) : '—' },
          { label: 'Statut', value: invoice.status },
        ];
        labels.forEach((item, i) => {
          const x = margin + colW * i;
          doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor(COLORS.textMuted)
            .text(item.label.toUpperCase(), x, yStart, { characterSpacing: 0.6 });
          if (item.label === 'Statut') {
            drawStatusBadge(x, yStart + 12, item.value);
          } else {
            doc
              .font('Helvetica-Bold')
              .fontSize(11)
              .fillColor(COLORS.text)
              .text(item.value, x, yStart + 12);
          }
        });
        return yStart + 40;
      };

      /* ========== Émetteur / Destinataire ========== */

      const drawPartiesBlock = (yStart: number): number => {
        const cardWidth = (contentWidth - 16) / 2;
        const cardHeight = 90;
        const cardRadius = 8;

        // Émetteur (gauche)
        doc.save();
        doc
          .roundedRect(margin, yStart, cardWidth, cardHeight, cardRadius)
          .lineWidth(1)
          .strokeColor(COLORS.border)
          .fillAndStroke('#fafafa', COLORS.border);
        doc.restore();
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor(COLORS.brand)
          .text('ÉMETTEUR', margin + 12, yStart + 12, { characterSpacing: 0.6 });
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(COLORS.text)
          .text('KADOOR SERVICE', margin + 12, yStart + 26);
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.textMuted)
          .text("Abidjan, Côte d'Ivoire", margin + 12, yStart + 42)
          .text('contact@kadoorservice.com', margin + 12, yStart + 56)
          .text('www.kadoorservice.com', margin + 12, yStart + 70);

        // Destinataire (droite)
        const rightX = margin + cardWidth + 16;
        doc.save();
        doc
          .roundedRect(rightX, yStart, cardWidth, cardHeight, cardRadius)
          .lineWidth(1)
          .strokeColor(COLORS.border)
          .fillAndStroke('#ffffff', COLORS.border);
        doc.restore();
        doc
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .fillColor(COLORS.brand)
          .text('FACTURÉ À', rightX + 12, yStart + 12, { characterSpacing: 0.6 });
        const fullName =
          `${invoice.user.firstName || ''} ${invoice.user.lastName || ''}`.trim() ||
          invoice.user.email ||
          'Client';
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(COLORS.text)
          .text(fullName, rightX + 12, yStart + 26, { width: cardWidth - 24, ellipsis: true });
        if (invoice.user.email) {
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(COLORS.textMuted)
            .text(invoice.user.email, rightX + 12, yStart + 42, {
              width: cardWidth - 24,
              ellipsis: true,
            });
        }
        if (invoice.bookingId) {
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(COLORS.textMuted)
            .text(
              `Réservation : #${String(invoice.bookingId).slice(0, 8)}…`,
              rightX + 12,
              yStart + 56,
            );
        }

        return yStart + cardHeight + 24;
      };

      /* ========== Tableau des lignes (paginé) ========== */

      // Colonnes : Description (flex), Qté, P.U., Total
      const colDesc = { x: margin + 12, w: contentWidth - 12 - 60 - 90 - 100 };
      const colQty = { x: colDesc.x + colDesc.w, w: 60 };
      const colPU = { x: colQty.x + colQty.w, w: 90 };
      const colTotal = { x: colPU.x + colPU.w, w: 100 - 12 };

      const drawTableHeader = (y: number): number => {
        const rowH = 26;
        doc.save();
        doc
          .rect(margin, y, contentWidth, rowH)
          .fill('#f9fafb');
        doc.restore();

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(COLORS.textMuted);
        doc.text('DESCRIPTION', colDesc.x, y + 9, { characterSpacing: 0.6 });
        doc.text('QTÉ', colQty.x, y + 9, { width: colQty.w - 8, align: 'right', characterSpacing: 0.6 });
        doc.text('P.U.', colPU.x, y + 9, { width: colPU.w - 8, align: 'right', characterSpacing: 0.6 });
        doc.text('TOTAL', colTotal.x, y + 9, { width: colTotal.w, align: 'right', characterSpacing: 0.6 });

        // Liseré rouge sous le header de tableau
        doc
          .save()
          .strokeColor(COLORS.brand)
          .lineWidth(1.5)
          .moveTo(margin, y + rowH)
          .lineTo(margin + contentWidth, y + rowH)
          .stroke()
          .restore();
        return y + rowH;
      };

      const ensureSpaceOrPaginate = (
        currentY: number,
        needed: number,
      ): { y: number; refreshedHeader: boolean } => {
        const bottomLimit = doc.page.height - margin - 90; // garder place pour totaux/footer si dernière
        if (currentY + needed > bottomLimit) {
          doc.addPage();
          drawHeader();
          drawStatusWatermark();
          const headerEnd = drawTableHeader(margin + 94);
          return { y: headerEnd, refreshedHeader: true };
        }
        return { y: currentY, refreshedHeader: false };
      };

      const drawLineRow = (
        y: number,
        index: number,
        line: { category: string; description: string; quantity: number; unitPrice: number; lineTotal: number },
      ): number => {
        const description = line.description || '—';
        // Calcul hauteur description (wrapping)
        doc.font('Helvetica').fontSize(10).fillColor(COLORS.text);
        const descHeight = doc.heightOfString(description, { width: colDesc.w - 8 });
        const rowH = Math.max(36, descHeight + 26);

        // Fond zébré
        if (index % 2 === 1) {
          doc.save().rect(margin, y, contentWidth, rowH).fill(COLORS.rowAlt).restore();
        }

        // Catégorie chip
        drawCategoryChip(colDesc.x, y + 8, line.category);

        // Description
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(COLORS.text)
          .text(description, colDesc.x, y + 24, { width: colDesc.w - 8 });

        // Qté
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(COLORS.text)
          .text(formatNumberFr(line.quantity), colQty.x, y + 12, {
            width: colQty.w - 8,
            align: 'right',
          });

        // P.U.
        doc.text(fmtAmount(line.unitPrice), colPU.x, y + 12, {
          width: colPU.w - 8,
          align: 'right',
        });

        // Total
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(COLORS.text)
          .text(fmtAmount(line.lineTotal), colTotal.x, y + 12, {
            width: colTotal.w,
            align: 'right',
          });

        // Séparateur fin
        doc
          .save()
          .strokeColor(COLORS.border)
          .lineWidth(0.5)
          .moveTo(margin, y + rowH)
          .lineTo(margin + contentWidth, y + rowH)
          .stroke()
          .restore();

        return y + rowH;
      };

      /* ========== Bloc Totaux ========== */

      const drawTotalsBlock = (yStart: number): number => {
        const boxW = 250;
        const boxX = margin + contentWidth - boxW;
        let cursorY = yStart + 16;

        const renderRow = (label: string, value: string, opts?: { strong?: boolean }) => {
          doc
            .font(opts?.strong ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(opts?.strong ? 11 : 10)
            .fillColor(opts?.strong ? COLORS.text : COLORS.textMuted)
            .text(label, boxX, cursorY, { width: boxW * 0.55 });
          doc
            .font(opts?.strong ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(opts?.strong ? 11 : 10)
            .fillColor(COLORS.text)
            .text(value, boxX + boxW * 0.55, cursorY, {
              width: boxW * 0.45,
              align: 'right',
            });
          cursorY += opts?.strong ? 18 : 16;
        };

        renderRow('Sous-total', fmtAmount(invoice.subtotal));
        if ((invoice.taxAmount || 0) > 0) {
          renderRow('Taxes', fmtAmount(invoice.taxAmount));
        }

        // Bloc Total surligné Kadoor
        const totalBoxY = cursorY + 6;
        const totalBoxH = 44;
        doc.save();
        doc
          .roundedRect(boxX, totalBoxY, boxW, totalBoxH, 8)
          .fill(COLORS.brand);
        doc
          .fillColor('#ffffff')
          .opacity(0.85)
          .font('Helvetica')
          .fontSize(8)
          .text('TOTAL À PAYER', boxX + 14, totalBoxY + 8, {
            width: boxW - 28,
            characterSpacing: 0.6,
          });
        doc.opacity(1);
        doc
          .fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(16)
          .text(fmtAmount(invoice.totalAmount), boxX + 14, totalBoxY + 19, {
            width: boxW - 28,
            align: 'right',
          });
        doc.restore();

        return totalBoxY + totalBoxH + 16;
      };

      /* ========== Notes & Conditions ========== */

      const drawNotesAndTerms = (yStart: number): number => {
        let y = yStart;
        if (invoice.customerNote) {
          const padding = 12;
          // Mesure hauteur
          doc.font('Helvetica').fontSize(9);
          const noteHeight = doc.heightOfString(invoice.customerNote, {
            width: contentWidth - padding * 2,
          });
          const boxH = noteHeight + padding * 2 + 16;

          doc.save();
          doc
            .roundedRect(margin, y, contentWidth, boxH, 8)
            .lineWidth(1)
            .strokeColor(COLORS.border)
            .fillAndStroke('#fafafa', COLORS.border);
          doc.restore();
          doc
            .font('Helvetica-Bold')
            .fontSize(7.5)
            .fillColor(COLORS.brand)
            .text('NOTE', margin + padding, y + padding, { characterSpacing: 0.6 });
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(COLORS.text)
            .text(invoice.customerNote, margin + padding, y + padding + 14, {
              width: contentWidth - padding * 2,
              lineGap: 2,
            });
          y += boxH + 12;
        }

        // Conditions de paiement
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(COLORS.textMuted)
          .text(
            'Conditions de paiement : règlement intégral à réception de la facture, sauf échéance précisée. Paiement sécurisé via Paystack disponible depuis votre espace client.',
            margin,
            y,
            { width: contentWidth, lineGap: 2, align: 'left' },
          );
        return y + 30;
      };

      /* ========== Footer (numérotation des pages) ========== */

      const drawFooterOnAllPages = () => {
        const range = doc.bufferedPageRange();
        for (let i = 0; i < range.count; i += 1) {
          doc.switchToPage(range.start + i);
          const footerY = doc.page.height - margin + 10;

          // Liseré
          doc
            .save()
            .strokeColor(COLORS.border)
            .lineWidth(0.5)
            .moveTo(margin, footerY - 8)
            .lineTo(margin + contentWidth, footerY - 8)
            .stroke()
            .restore();

          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(COLORS.textMuted)
            .text(
              `KADOOR SERVICE · contact@kadoorservice.com · www.kadoorservice.com`,
              margin,
              footerY,
              { width: contentWidth * 0.7, align: 'left' },
            );
          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(COLORS.textMuted)
            .text(
              `Page ${i + 1} / ${range.count}`,
              margin + contentWidth * 0.7,
              footerY,
              { width: contentWidth * 0.3, align: 'right' },
            );
        }
      };

      /* ========== Composition ========== */

      drawHeader();
      drawStatusWatermark();
      let y = margin + 94;

      y = drawMetaBlock(y);
      y = drawPartiesBlock(y);

      // Titre section lignes
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(COLORS.text)
        .text('Détail des prestations', margin, y);
      y += 18;

      y = drawTableHeader(y);

      const lines = invoice.lines || [];
      if (lines.length === 0) {
        doc
          .font('Helvetica-Oblique')
          .fontSize(10)
          .fillColor(COLORS.textMuted)
          .text('Aucune ligne enregistrée pour cette facture.', margin + 12, y + 14);
        y += 40;
      } else {
        lines.forEach((line, idx) => {
          const space = ensureSpaceOrPaginate(y, 60);
          y = space.y;
          y = drawLineRow(y, idx, line);
        });
      }

      // Pagination si totaux ne tiennent pas
      const totalsNeeded = 90 + (invoice.customerNote ? 60 : 0) + 40;
      const space = ensureSpaceOrPaginate(y, totalsNeeded);
      y = space.y;
      if (!space.refreshedHeader) y += 8;

      y = drawTotalsBlock(y);
      y = drawNotesAndTerms(y);

      drawFooterOnAllPages();

      doc.end();
    });
  }
}
