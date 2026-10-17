import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceSettlementType, InvoiceStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { GeniusPayService } from '../payments/providers/geniuspay/geniuspay.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { AuditService } from '../audit/audit.service';
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
  pageMetrics,
  stampFootersOnAllPages,
  type LineItemRow,
} from '../common/pdf/vercel-style-layout';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private geniusPayService: GeniusPayService,
    private configService: ConfigService,
    private audit: AuditService,
  ) {}

  private buildReference(): string {
    return `INV-${Date.now().toString().slice(-8)}`;
  }

  private toAmount(lines: Array<{ quantity: number; unitPrice: number }>, taxAmount = 0) {
    const subtotal = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitPrice), 0);
    const totalAmount = subtotal + Number(taxAmount || 0);
    return { subtotal, totalAmount };
  }

  /** Décompte caution : retenues = sous-total des lignes (hors taxe). */
  private computeDepositSnapshot(
    depositEnabled: boolean | undefined,
    depositAmount: number | undefined,
    deductionsSubtotal: number,
  ) {
    if (!depositEnabled) {
      return {
        depositAmount: null,
        depositDeductionsAmount: null,
        depositRefundAmount: null,
        depositSupplementAmount: null,
      };
    }
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(
        'Montant de caution requis lorsque la caution est activée',
      );
    }
    const deductions = Number(deductionsSubtotal) || 0;
    return {
      depositAmount: amount,
      depositDeductionsAmount: deductions,
      depositRefundAmount: Math.max(0, amount - deductions),
      depositSupplementAmount: Math.max(0, deductions - amount),
    };
  }

  private computeSettlement(
    deposit: {
      depositAmount: number | null;
      depositRefundAmount: number | null;
      depositSupplementAmount: number | null;
    },
    taxAmount: number,
    totalAmount: number,
  ): { settlementType: InvoiceSettlementType; amountDue: number } {
    const tax = Number(taxAmount) || 0;
    if (deposit.depositAmount == null || deposit.depositAmount <= 0) {
      return { settlementType: 'CLIENT_PAYS', amountDue: totalAmount };
    }
    const supplement = deposit.depositSupplementAmount ?? 0;
    const refund = deposit.depositRefundAmount ?? 0;
    if (supplement > 0) {
      return { settlementType: 'CLIENT_PAYS', amountDue: supplement + tax };
    }
    if (refund > 0) {
      return { settlementType: 'KADOR_REFUND', amountDue: refund };
    }
    return { settlementType: 'ZERO_BALANCE', amountDue: 0 };
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
    const deposit = this.computeDepositSnapshot(
      dto.depositEnabled,
      dto.depositAmount,
      subtotal,
    );
    const settlement = this.computeSettlement(
      deposit,
      dto.taxAmount || 0,
      totalAmount,
    );

    return this.prisma.$transaction(async (tx) => {
      if (dto.depositEnabled && deposit.depositAmount != null) {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            depositAmount: deposit.depositAmount,
            depositPaymentMethod: dto.depositPaymentMethod ?? null,
            depositCollectedAt: dto.depositCollectedAt
              ? new Date(dto.depositCollectedAt)
              : booking.depositCollectedAt ?? new Date(),
            depositNote: dto.depositNote?.trim() || null,
          },
        });
      }

      return tx.invoice.create({
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
          ...deposit,
          depositPaymentMethod: dto.depositEnabled
            ? dto.depositPaymentMethod ?? null
            : null,
          depositNote: dto.depositEnabled ? dto.depositNote?.trim() || null : null,
          settlementType: settlement.settlementType,
          amountDue: settlement.amountDue,
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
    });
  }

  async findAllAdmin(status?: InvoiceStatus) {
    // Garde-fou : évite qu'une liste de factures qui grossit à l'infini ne finisse
    // par ralentir/faire planter cet endpoint admin. Pagination complète à ajouter
    // si le volume dépasse durablement ce plafond.
    return this.prisma.invoice.findMany({
      where: status ? { status } : {},
      include: this.invoiceInclude,
      orderBy: { createdAt: 'desc' },
      take: 1000,
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

    const depositEnabled =
      dto.depositEnabled !== undefined
        ? dto.depositEnabled
        : existing.depositAmount != null && existing.depositAmount > 0;
    const depositAmountInput =
      dto.depositAmount !== undefined ? dto.depositAmount : existing.depositAmount ?? undefined;

    const deposit = this.computeDepositSnapshot(
      depositEnabled,
      depositAmountInput,
      subtotal,
    );
    const settlement = this.computeSettlement(
      deposit,
      dto.taxAmount ?? existing.taxAmount,
      totalAmount,
    );

    return this.prisma.$transaction(async (tx) => {
      if (depositEnabled && deposit.depositAmount != null) {
        await tx.booking.update({
          where: { id: existing.bookingId },
          data: {
            depositAmount: deposit.depositAmount,
            depositPaymentMethod:
              dto.depositPaymentMethod ?? existing.depositPaymentMethod ?? null,
            depositCollectedAt: dto.depositCollectedAt
              ? new Date(dto.depositCollectedAt)
              : undefined,
            depositNote:
              dto.depositNote !== undefined
                ? dto.depositNote?.trim() || null
                : existing.depositNote,
          },
        });
      }

      return tx.invoice.update({
        where: { id },
        data: {
          dueAt: dto.dueAt ? new Date(dto.dueAt) : existing.dueAt,
          taxAmount: dto.taxAmount ?? existing.taxAmount,
          subtotal,
          totalAmount,
          internalNote: dto.internalNote ?? existing.internalNote,
          customerNote: dto.customerNote ?? existing.customerNote,
          ...deposit,
          depositPaymentMethod: depositEnabled
            ? dto.depositPaymentMethod ?? existing.depositPaymentMethod ?? null
            : null,
          depositNote: depositEnabled
            ? (dto.depositNote !== undefined
                ? dto.depositNote?.trim() || null
                : existing.depositNote)
            : null,
          settlementType: settlement.settlementType,
          amountDue: settlement.amountDue,
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
    });
  }

  async send(id: string) {
    const invoice = await this.findOneAdmin(id);
    if (!invoice.lines.length) throw new BadRequestException('Facture vide');
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
      include: this.invoiceInclude,
    });
    await this.audit.record({
      action: 'invoice.send',
      entityType: 'Invoice',
      entityId: id,
      outcome: 'SUCCESS',
      source: 'ADMIN_UI',
      summary: `Facture envoyée (${invoice.reference || id})`,
      before: { status: invoice.status },
      after: { status: 'SENT' },
    });
    return updated;
  }

  async markPaid(id: string) {
    const invoice = await this.findOneAdmin(id);
    if (invoice.status === 'CANCELLED') throw new BadRequestException('Facture annulée');
    const now = new Date();
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: now,
        refundedAt: invoice.settlementType === 'KADOR_REFUND' ? now : invoice.refundedAt,
      },
      include: this.invoiceInclude,
    });
    await this.audit.record({
      action: 'invoice.mark_paid',
      entityType: 'Invoice',
      entityId: id,
      outcome: 'SUCCESS',
      source: 'ADMIN_UI',
      summary: `Facture marquée payée (${invoice.reference || id})`,
      before: { status: invoice.status },
      after: { status: 'PAID' },
    });
    return updated;
  }

  async cancel(id: string) {
    const invoice = await this.findOneAdmin(id);
    if (invoice.status === 'PAID') throw new BadRequestException('Facture déjà payée');
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: this.invoiceInclude,
    });
    await this.audit.record({
      action: 'invoice.cancel',
      entityType: 'Invoice',
      entityId: id,
      outcome: 'SUCCESS',
      source: 'ADMIN_UI',
      summary: `Facture annulée (${invoice.reference || id})`,
      before: { status: invoice.status },
      after: { status: 'CANCELLED' },
    });
    return updated;
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
    if (invoice.settlementType !== 'CLIENT_PAYS') {
      throw new BadRequestException(
        'Cette facture ne requiert pas de paiement en ligne : Kadoor vous remboursera la caution ou le solde est nul.',
      );
    }
    const amountDue = Number(invoice.amountDue) || 0;
    if (amountDue <= 0) {
      throw new BadRequestException('Aucun montant à payer pour cette facture');
    }

    const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
    const locale = this.configService.get<string>('WEB_APP_DEFAULT_LOCALE') || 'fr';
    const callback = `${webAppUrl}/${locale}/payment/callback?invoiceId=${invoice.id}`;

    const result = await this.geniusPayService.createPayment({
      amount: amountDue,
      description: `Facture ${invoice.reference || invoice.id}`,
      customer: { email: userEmail },
      success_url: callback,
      error_url: callback,
      metadata: {
        paymentType: 'invoice',
        entityId: invoice.id,
        userId,
        invoiceId: invoice.id,
      },
    });

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { paymentReference: result.reference },
    });

    return { paymentUrl: result.checkout_url, reference: result.reference };
  }

  async verifyPayment(userId: string, id: string, paymentRefFromCallback?: string) {
    const invoice = await this.findMineOne(userId, id);
    const reference =
      paymentRefFromCallback?.trim() || invoice.paymentReference || undefined;
    if (!reference) throw new BadRequestException('Référence de paiement absente');

    if (invoice.status === 'PAID') {
      return { status: 'success', invoice, message: 'Facture déjà payée' };
    }

    const verification = await this.geniusPayService.getPayment(reference);
    if (verification.status === 'success') {
      const updated = await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', paidAt: new Date(), paymentReference: reference },
        include: this.invoiceInclude,
      });
      return { status: 'success', invoice: updated };
    }

    const mapped = verification.status === 'failed' ? 'failed' : 'pending';

    return { status: mapped, invoice, paymentStatus: verification.status };
  }

  async applyPaymentResultFromWebhook(invoiceId: string, success: boolean) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return { status: 'ok' };
    if (invoice.status === 'PAID') return { status: 'ok' };
    if (!success) return { status: 'ok' };

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    await this.audit.record({
      action: 'invoice.paid_by_payment',
      entityType: 'Invoice',
      entityId: invoiceId,
      outcome: 'SUCCESS',
      source: 'WEBHOOK',
      summary: `Facture payée via GeniusPay (${invoice.reference || invoiceId})`,
      metadata: { reference: invoice.paymentReference },
    });
    return { status: 'ok' };
  }

  /**
   * Facture admin — modèle type Vercel, français, contexte Kadoor Service.
   * Conserve le décompte caution / settlement (CLIENT_PAYS, KADOR_REFUND, ZERO_BALANCE).
   */
  async generateInvoicePdf(id: string) {
    const invoice = await this.findOneAdmin(id);
    const CATEGORY_LABELS: Record<string, string> = {
      DAMAGE: 'Dommage',
      LATE_RETURN: 'Retour en retard',
      MILEAGE_OVERAGE: 'Dépassement km',
      TRAFFIC_FINE: 'Amende routière',
      CLEANING: 'Nettoyage',
      OTHER: 'Autre',
    };

    const amountDue = Number(invoice.amountDue ?? invoice.totalAmount) || 0;
    const settlement = invoice.settlementType || 'CLIENT_PAYS';
    const isPaid = invoice.status === 'PAID';
    const issueDate = formatDateFrLong(invoice.issuedAt || invoice.createdAt);
    const dueDate = invoice.dueAt ? formatDateFrLong(invoice.dueAt) : issueDate;
    const paidDate = invoice.paidAt ? formatDateFrLong(invoice.paidAt) : null;
    const fullName =
      `${invoice.user.firstName || ''} ${invoice.user.lastName || ''}`.trim() ||
      invoice.user.email ||
      'Client';

    const lineRows: LineItemRow[] = (invoice.lines || []).map((line) => ({
      description: line.description || CATEGORY_LABELS[line.category] || 'Prestation',
      subtitle: CATEGORY_LABELS[line.category] || undefined,
      qty: line.quantity,
      unitPrice: formatAmountFcfa(line.unitPrice),
      amount: formatAmountFcfa(line.lineTotal),
    }));

    const webAppUrl = this.configService.get<string>('WEB_APP_URL') || 'http://localhost:3000';
    const locale = this.configService.get<string>('WEB_APP_DEFAULT_LOCALE') || 'fr';
    const payUrl =
      settlement === 'CLIENT_PAYS' && !isPaid && amountDue > 0
        ? `${webAppUrl.replace(/\/$/, '')}/${locale}/invoices/${invoice.id}`
        : null;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `Facture ${invoice.reference}`,
          Author: 'Kadoor Service',
          Subject: `Facture ${invoice.reference}`,
          Creator: 'Kadoor Service',
        },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      drawTopBar(doc);
      let y = drawDocumentTitle(doc, isPaid ? 'Reçu' : 'Facture');

      const meta = [
        { label: 'N° de facture', value: invoice.reference || id },
      ];
      if (isPaid) {
        meta.push({ label: 'N° de reçu', value: `R-${(invoice.reference || id).replace(/^INV-?/i, '')}` });
        meta.push({ label: 'Date de paiement', value: paidDate || issueDate });
      } else {
        meta.push({ label: "Date d'émission", value: issueDate });
        meta.push({ label: "Date d'échéance", value: dueDate });
      }
      y = drawMetaRows(doc, meta, y);

      y = drawPartiesColumns(
        doc,
        {
          name: fullName,
          lines: ["Côte d'Ivoire"],
          email: invoice.user.email,
        },
        y,
      );

      let banner: string;
      if (settlement === 'KADOR_REFUND') {
        banner = isPaid
          ? `${formatAmountFcfa(amountDue)} remboursé${paidDate ? ` le ${paidDate}` : ''}`
          : `${formatAmountFcfa(amountDue)} à rendre au client`;
      } else if (settlement === 'ZERO_BALANCE') {
        banner = 'Compte réglé — aucun montant dû';
      } else if (isPaid) {
        banner = `${formatAmountFcfa(amountDue)} payé${paidDate ? ` le ${paidDate}` : ''}`;
      } else {
        banner = `${formatAmountFcfa(amountDue)} à payer le ${dueDate}`;
      }
      y = drawAmountBanner(doc, banner, y);

      if (payUrl) {
        y = drawPayOnlineButton(doc, 'Payer en ligne', payUrl, y);
      } else {
        y += 6;
      }

      if (lineRows.length === 0) {
        const { left } = pageMetrics(doc);
        doc
          .font('Helvetica-Oblique')
          .fontSize(10)
          .fillColor('#666666')
          .text('Aucune ligne enregistrée pour cette facture.', left, y);
        y += 28;
      } else {
        y = drawItemsTable(doc, lineRows, y);
      }

      const totals: Array<{ label: string; value: string; emphasize?: boolean }> = [
        { label: 'Sous-total', value: formatAmountFcfa(invoice.subtotal) },
      ];
      if ((invoice.taxAmount || 0) > 0) {
        totals.push({ label: 'Taxes', value: formatAmountFcfa(invoice.taxAmount) });
      }
      if (invoice.depositAmount != null && invoice.depositAmount > 0) {
        totals.push({ label: 'Caution encaissée', value: formatAmountFcfa(invoice.depositAmount) });
        totals.push({
          label: 'Retenues (lignes)',
          value: formatAmountFcfa(invoice.depositDeductionsAmount ?? invoice.subtotal),
        });
        totals.push({
          label: 'À rendre au client',
          value: formatAmountFcfa(invoice.depositRefundAmount ?? 0),
        });
        if ((invoice.depositSupplementAmount ?? 0) > 0) {
          totals.push({
            label: 'Complément à facturer',
            value: formatAmountFcfa(invoice.depositSupplementAmount ?? 0),
          });
        }
      }
      totals.push({ label: 'Total', value: formatAmountFcfa(invoice.totalAmount), emphasize: true });

      let dueLabel = 'Montant dû';
      if (settlement === 'KADOR_REFUND') dueLabel = isPaid ? 'Montant remboursé' : 'À rendre au client';
      else if (settlement === 'ZERO_BALANCE') dueLabel = 'Solde';
      else if (isPaid) dueLabel = 'Montant payé';
      totals.push({ label: dueLabel, value: formatAmountFcfa(amountDue), emphasize: true });

      y = drawTotalsStack(doc, totals, y);

      if (invoice.customerNote) {
        const { left, contentWidth } = pageMetrics(doc);
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#666666')
          .text('Note', left, y);
        y += 12;
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#0a0a0a')
          .text(invoice.customerNote, left, y, { width: contentWidth });
        y += doc.heightOfString(invoice.customerNote, { width: contentWidth }) + 16;
      }

      if (isPaid) {
        const method = invoice.paymentReference
          ? `GeniusPay — ${invoice.paymentReference}`
          : 'GeniusPay / règlement manuel';
        y = drawPaymentHistory(
          doc,
          [
            {
              method,
              date: paidDate || issueDate,
              amount: formatAmountFcfa(amountDue),
              receiptNumber: `R-${(invoice.reference || id).replace(/^INV-?/i, '')}`,
            },
          ],
          y,
        );
      }

      stampFootersOnAllPages(doc);
      doc.end();
    });
  }
}
