import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../reservations/paystack.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

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
    return this.prisma.invoice.findMany({
      where: { userId },
      include: this.invoiceInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMineOne(userId: string, id: string) {
    const invoice = await this.findOneAdmin(id);
    if (invoice.userId !== userId) throw new ForbiddenException('Accès refusé');
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

  async generateInvoicePdf(id: string) {
    const invoice = await this.findOneAdmin(id);
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text('FACTURE COMPLEMENTAIRE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11).text(`Reference: ${invoice.reference}`);
      doc.text(`Client: ${invoice.user.firstName || ''} ${invoice.user.lastName || ''}`.trim());
      doc.text(`Statut: ${invoice.status}`);
      doc.text(`Date: ${new Date(invoice.issuedAt).toLocaleDateString('fr-FR')}`);
      doc.moveDown();
      doc.fontSize(12).text('Lignes de facturation');
      doc.moveDown(0.5);
      invoice.lines.forEach((line, i) => {
        doc
          .fontSize(10)
          .text(
            `${i + 1}. [${line.category}] ${line.description} — ${line.quantity} x ${line.unitPrice.toLocaleString(
              'fr-FR',
            )} = ${line.lineTotal.toLocaleString('fr-FR')} FCFA`,
          );
      });
      doc.moveDown();
      doc.fontSize(11).text(`Sous-total: ${invoice.subtotal.toLocaleString('fr-FR')} FCFA`);
      doc.text(`Taxe: ${invoice.taxAmount.toLocaleString('fr-FR')} FCFA`);
      doc.fontSize(13).text(`Total: ${invoice.totalAmount.toLocaleString('fr-FR')} FCFA`, { align: 'right' });
      doc.end();
    });
  }
}
