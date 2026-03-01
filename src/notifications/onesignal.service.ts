import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
  data?: Record<string, any>;
}

export interface PushPayload {
  userId?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  url?: string;
}

@Injectable()
export class OneSignalService {
  private readonly logger = new Logger(OneSignalService.name);
  private readonly appId: string;
  private readonly restApiKey: string;
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    this.appId = this.configService.get<string>('ONESIGNAL_APP_ID') || '';
    this.restApiKey = this.configService.get<string>('ONESIGNAL_REST_API_KEY') || '';
    this.isConfigured = !!(this.appId && this.restApiKey);

    if (!this.isConfigured) {
      this.logger.warn(
        'OneSignal is not configured. Set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY environment variables.',
      );
    }
  }

  /**
   * Check if OneSignal is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Send an email via OneSignal
   * NOTE: Requires OneSignal API keys to be configured
   */
  async sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      this.logger.warn('OneSignal not configured - email not sent', { to: payload.to, subject: payload.subject });
      return { 
        success: false, 
        error: 'OneSignal not configured. Please set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY.' 
      };
    }

    try {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.restApiKey}`,
        },
        body: JSON.stringify({
          app_id: this.appId,
          include_email_tokens: [payload.to],
          email_subject: payload.subject,
          email_body: payload.body,
          ...(payload.templateId && { template_id: payload.templateId }),
          ...(payload.data && { data: payload.data }),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error('OneSignal email error', result);
        return { success: false, error: result.errors?.[0] || 'Unknown error' };
      }

      this.logger.log('Email sent successfully', { to: payload.to, messageId: result.id });
      return { success: true, messageId: result.id };
    } catch (error) {
      this.logger.error('Failed to send email via OneSignal', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a push notification via OneSignal
   * NOTE: Requires OneSignal API keys to be configured
   */
  async sendPush(payload: PushPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      this.logger.warn('OneSignal not configured - push not sent', { title: payload.title });
      return { 
        success: false, 
        error: 'OneSignal not configured. Please set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY.' 
      };
    }

    try {
      const notificationPayload: Record<string, any> = {
        app_id: this.appId,
        headings: { en: payload.title, fr: payload.title },
        contents: { en: payload.message, fr: payload.message },
        ...(payload.data && { data: payload.data }),
        ...(payload.url && { url: payload.url }),
      };

      // Target specific user or all users
      if (payload.userId) {
        notificationPayload.include_external_user_ids = [payload.userId];
      } else {
        notificationPayload.included_segments = ['All'];
      }

      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.restApiKey}`,
        },
        body: JSON.stringify(notificationPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        this.logger.error('OneSignal push error', result);
        return { success: false, error: result.errors?.[0] || 'Unknown error' };
      }

      this.logger.log('Push notification sent successfully', { messageId: result.id });
      return { success: true, messageId: result.id };
    } catch (error) {
      this.logger.error('Failed to send push via OneSignal', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create or update a user in OneSignal
   */
  async createOrUpdateUser(externalUserId: string, email: string, tags?: Record<string, string>): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn('OneSignal not configured - user not created/updated');
      return false;
    }

    try {
      const response = await fetch(`https://onesignal.com/api/v1/apps/${this.appId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.restApiKey}`,
        },
        body: JSON.stringify({
          identity: { external_id: externalUserId },
          subscriptions: [{ type: 'Email', token: email }],
          ...(tags && { tags }),
        }),
      });

      return response.ok;
    } catch (error) {
      this.logger.error('Failed to create/update user in OneSignal', error);
      return false;
    }
  }
}
