import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GeniusPayService } from './providers/geniuspay/geniuspay.service';
import { ReservationsService } from '../reservations/reservations.service';
import { GiftCardsService } from '../gift-cards/gift-cards.service';
import { InvoicesService } from '../invoices/invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly geniusPay: GeniusPayService,
    private readonly reservationsService: ReservationsService,
    private readonly giftCardsService: GiftCardsService,
    private readonly invoicesService: InvoicesService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post('geniuspay/notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook GeniusPay (public)' })
  async geniusPayNotify(
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-timestamp') timestamp: string,
    @Headers('x-webhook-event') event: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    const rawBody: string | Buffer = req.rawBody || JSON.stringify(body);
    const ok = this.geniusPay.verifyWebhookSignature(rawBody, signature, timestamp);
    if (!ok) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    if (event === 'webhook.test' || body?.event === 'webhook.test') {
      await this.audit.record({
        action: 'payment.webhook.test',
        entityType: 'Payment',
        outcome: 'SUCCESS',
        source: 'WEBHOOK',
        summary: 'Webhook GeniusPay test reçu',
      });
      return { status: 'ok', message: 'test received' };
    }

    await this.audit.record({
      action: 'payment.webhook.received',
      entityType: 'Payment',
      outcome: 'SUCCESS',
      source: 'WEBHOOK',
      summary: `Webhook GeniusPay reçu (${event || 'unknown'})`,
      metadata: { event, reference: body?.data?.reference },
    });

    const data = body?.data || body;
    const metadata = data?.metadata || {};
    let paymentType = metadata.paymentType as string | undefined;
    let entityId = (metadata.entityId || metadata.bookingId || metadata.giftCardId || metadata.batchId || metadata.invoiceId) as
      | string
      | undefined;
    const reference = data?.reference as string | undefined;

    // Fallback : retrouver l'entité via la référence GeniusPay
    if ((!paymentType || !entityId) && reference) {
      const booking = await this.prisma.booking.findFirst({ where: { paymentReference: reference } });
      if (booking) {
        paymentType = 'booking';
        entityId = booking.id;
      } else {
        const card = await this.prisma.giftCard.findFirst({ where: { paymentReference: reference } });
        if (card) {
          paymentType = 'gift_card';
          entityId = card.id;
        } else {
          const batch = await this.prisma.giftCardBatch.findFirst({ where: { paymentReference: reference } });
          if (batch) {
            paymentType = 'gift_card_batch';
            entityId = batch.id;
          } else {
            const invoice = await this.prisma.invoice.findFirst({ where: { paymentReference: reference } });
            if (invoice) {
              paymentType = 'invoice';
              entityId = invoice.id;
            }
          }
        }
      }
    }

    if (!paymentType || !entityId) {
      this.logger.warn(`Webhook GeniusPay sans metadata exploitable: event=${event} ref=${reference}`);
      return { status: 'ok' };
    }

    // Toujours re-vérifier auprès de GeniusPay avant d'activer un droit
    let success = false;
    if (reference) {
      try {
        const verification = await this.geniusPay.getPayment(reference);
        success = verification.status === 'success';
        if (verification.status === 'pending') {
          return { status: 'ok', message: 'pending' };
        }
      } catch (err: any) {
        this.logger.error(`Webhook re-verify failed: ${err?.message || err}`);
        return { status: 'ok', message: 'verify_error' };
      }
    } else {
      const ev = (event || body?.event || '').toLowerCase();
      success = ev.includes('success') || ev.includes('completed');
    }

    try {
      if (paymentType === 'booking') {
        await this.reservationsService.applyPaymentResultFromWebhook(entityId, success);
      } else if (paymentType === 'gift_card') {
        if (success) await this.giftCardsService.activateByEntityId(entityId);
        else await this.giftCardsService.cancelByEntityId(entityId);
      } else if (paymentType === 'gift_card_batch') {
        if (success) await this.giftCardsService.activateBatchByEntityId(entityId);
        else await this.giftCardsService.cancelBatchByEntityId(entityId);
      } else if (paymentType === 'invoice') {
        await this.invoicesService.applyPaymentResultFromWebhook(entityId, success);
      }

      await this.audit.record({
        action: success ? 'payment.verified.success' : 'payment.verified.failed',
        entityType:
          paymentType === 'booking'
            ? 'Booking'
            : paymentType === 'gift_card'
              ? 'GiftCard'
              : paymentType === 'gift_card_batch'
                ? 'GiftCardBatch'
                : 'Invoice',
        entityId,
        outcome: success ? 'SUCCESS' : 'FAILURE',
        source: 'WEBHOOK',
        summary: success
          ? `Paiement confirmé (${paymentType})`
          : `Paiement échoué (${paymentType})`,
        metadata: { paymentType, reference },
      });
    } catch (err: any) {
      this.logger.error(`Webhook apply error (${paymentType}/${entityId}): ${err?.message || err}`);
      await this.audit.record({
        action: 'payment.webhook.apply_error',
        entityType: 'Payment',
        entityId,
        outcome: 'FAILURE',
        source: 'WEBHOOK',
        summary: `Erreur application webhook: ${err?.message || err}`,
        metadata: { paymentType, reference },
      });
    }

    return { status: 'ok' };
  }
}
