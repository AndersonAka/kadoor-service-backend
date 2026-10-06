import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export type GeniusPayPaymentStatus = 'success' | 'failed' | 'pending';

export interface GeniusPayCreateResult {
  reference: string;
  checkout_url: string;
  status?: string;
}

export interface GeniusPayVerifyResult {
  status: GeniusPayPaymentStatus;
  reference: string;
  amount: number;
  currency: string;
  rawStatus: string;
  metadata?: Record<string, any>;
}

const GENIUSPAY_TIMEOUT_MS = 15000;
const GENIUSPAY_BASE_URL = 'https://geniuspay.ci/api/v1/merchant';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = GENIUSPAY_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function mapStatus(raw: string | undefined): GeniusPayPaymentStatus {
  const s = (raw || '').toLowerCase();
  if (s === 'completed' || s === 'success' || s === 'paid') return 'success';
  if (s === 'failed' || s === 'cancelled' || s === 'canceled' || s === 'expired' || s === 'abandoned') {
    return 'failed';
  }
  return 'pending';
}

@Injectable()
export class GeniusPayService {
  private readonly logger = new Logger(GeniusPayService.name);
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GENIUSPAY_API_KEY') || '';
    this.apiSecret = this.configService.get<string>('GENIUSPAY_API_SECRET') || '';
    this.webhookSecret = this.configService.get<string>('GENIUSPAY_WEBHOOK_SECRET') || '';

    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn('GENIUSPAY_API_KEY / GENIUSPAY_API_SECRET not configured');
    }
  }

  private get headers() {
    return {
      'X-API-Key': this.apiKey,
      'X-API-Secret': this.apiSecret,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Crée un paiement checkout hébergé (sans payment_method).
   * Montant en unité principale (XOF), minimum 200.
   */
  async createPayment(params: {
    amount: number;
    currency?: string;
    description?: string;
    customer?: { email?: string; firstName?: string; lastName?: string; phone?: string };
    metadata?: Record<string, any>;
    success_url: string;
    error_url: string;
  }): Promise<GeniusPayCreateResult> {
    if (!this.apiKey || !this.apiSecret) {
      throw new BadRequestException('Paiement en ligne non configuré (GeniusPay)');
    }

    const amount = Math.round(Number(params.amount));
    if (!Number.isFinite(amount) || amount < 200) {
      throw new BadRequestException('Le montant minimum de paiement est de 200 XOF');
    }

    const body: Record<string, any> = {
      amount,
      currency: params.currency || 'XOF',
      description: params.description || 'Paiement Kadoor Service',
      success_url: params.success_url,
      error_url: params.error_url,
      metadata: params.metadata || {},
    };

    if (params.customer) {
      body.customer = {
        email: params.customer.email,
        first_name: params.customer.firstName,
        last_name: params.customer.lastName,
        phone: params.customer.phone,
      };
    }

    // Ne pas envoyer payment_method → checkout hébergé GeniusPay
    const response = await fetchWithTimeout(`${GENIUSPAY_BASE_URL}/payments`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data?.message || data?.error || `GeniusPay error ${response.status}`;
      this.logger.error(`createPayment failed: ${msg}`);
      throw new BadRequestException(typeof msg === 'string' ? msg : 'Échec de création du paiement');
    }

    const payload = data?.data || data;
    const reference = payload?.reference;
    const checkoutUrl = payload?.checkout_url || payload?.payment_url;

    if (!reference || !checkoutUrl) {
      this.logger.error(`createPayment: missing reference/checkout_url: ${JSON.stringify(data)}`);
      throw new BadRequestException('Réponse GeniusPay invalide (URL de paiement manquante)');
    }

    return {
      reference,
      checkout_url: checkoutUrl,
      status: payload?.status,
    };
  }

  async getPayment(reference: string): Promise<GeniusPayVerifyResult> {
    if (!reference) {
      throw new BadRequestException('Référence de paiement manquante');
    }

    const response = await fetchWithTimeout(
      `${GENIUSPAY_BASE_URL}/payments/${encodeURIComponent(reference)}`,
      { headers: this.headers },
    );

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data?.message || data?.error || `GeniusPay verify error ${response.status}`;
      this.logger.error(`getPayment failed: ${msg}`);
      throw new BadRequestException(typeof msg === 'string' ? msg : 'Échec de vérification du paiement');
    }

    const payload = data?.data || data;
    const rawStatus = payload?.status || '';

    return {
      status: mapStatus(rawStatus),
      reference: payload?.reference || reference,
      amount: Number(payload?.amount) || 0,
      currency: payload?.currency || 'XOF',
      rawStatus,
      metadata: payload?.metadata || {},
    };
  }

  /**
   * Signature = HMAC-SHA256(timestamp + "." + rawBody, WEBHOOK_SECRET) en hex.
   */
  verifyWebhookSignature(rawBody: string | Buffer, signature: string, timestamp: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('GENIUSPAY_WEBHOOK_SECRET not configured – skipping signature check');
      return true;
    }
    if (!signature || !timestamp) return false;

    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.${bodyStr}`)
      .digest('hex');

    try {
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(signature, 'utf8');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return expected === signature;
    }
  }
}
