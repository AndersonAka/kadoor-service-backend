import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface PaystackInitResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResult {
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  reference: string;
  amount: number;
  currency: string;
  channel: string;
  paid_at: string;
  gateway_response: string;
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
    this.webhookSecret = this.configService.get<string>('PAYSTACK_WEBHOOK_SECRET') || '';

    if (!this.secretKey) {
      this.logger.warn('⚠️ PAYSTACK_SECRET_KEY not configured');
    }
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async initializeTransaction(params: {
    email: string;
    amount: number; // in main unit (e.g. 5000 XOF) - will be multiplied by 100
    currency?: string;
    reference: string;
    callback_url: string;
    metadata?: Record<string, any>;
  }): Promise<PaystackInitResult> {
    const amountInSubunit = Math.round(params.amount * 100);

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        email: params.email,
        amount: amountInSubunit,
        currency: params.currency || 'XOF',
        reference: params.reference,
        callback_url: params.callback_url,
        metadata: params.metadata,
      }),
    });

    const data: any = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to initialize Paystack transaction');
    }

    return data.data as PaystackInitResult;
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyResult> {
    const response = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: this.headers },
    );

    const data: any = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Failed to verify Paystack transaction');
    }

    return data.data as PaystackVerifyResult;
  }

  validateWebhookSignature(signature: string, rawBody: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('⚠️ PAYSTACK_WEBHOOK_SECRET not configured – skipping signature check');
      return true;
    }
    const hash = crypto
      .createHmac('sha512', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  }
}
