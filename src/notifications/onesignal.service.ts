import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OneSignal from '@onesignal/node-onesignal';
import { SendPushDto, SendEmailDto } from './dto';

@Injectable()
export class OneSignalService {
  private readonly logger = new Logger(OneSignalService.name);
  private readonly client: OneSignal.DefaultApi;
  private readonly appId: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const restApiKey = this.configService.get<string>('ONESIGNAL_REST_API_KEY');
    const appId = this.configService.get<string>('ONESIGNAL_APP_ID');

    this.isConfigured = !!(restApiKey && appId);
    this.appId = appId || '';

    if (!this.isConfigured) {
      this.logger.warn(
        'OneSignal credentials not configured. Push/Email notifications will not work.',
      );
    }

    const configuration = OneSignal.createConfiguration({
      restApiKey: restApiKey || '',
    });

    this.client = new OneSignal.DefaultApi(configuration);
    this.logger.log('OneSignal client initialized');
  }

  /**
   * Check if OneSignal is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Envoie une notification push
   */
  async sendPush(dto: SendPushDto): Promise<OneSignal.CreateNotificationSuccessResponse | null> {
    if (!this.isConfigured) {
      this.logger.warn('OneSignal not configured - push not sent');
      return null;
    }

    try {
      const notification = new OneSignal.Notification();
      notification.app_id = this.appId;

      // Ciblage
      if (dto.includedSegments) {
        notification.included_segments = dto.includedSegments;
      }
      if (dto.includeSubscriptionIds) {
        notification.include_subscription_ids = dto.includeSubscriptionIds;
      }
      if (dto.includeAliases) {
        notification.include_aliases = dto.includeAliases;
        notification.target_channel = 'push';
      }

      // Contenu
      notification.contents = dto.contents;
      if (dto.headings) {
        notification.headings = dto.headings;
      }

      // Options
      if (dto.url) {
        notification.url = dto.url;
      }
      if (dto.data) {
        notification.data = dto.data;
      }
      if (dto.bigPicture) {
        notification.big_picture = dto.bigPicture;
      }

      const result = await this.client.createNotification(notification);
      this.logger.log(`Push notification sent: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
      return null;
    }
  }

  /**
   * Envoie un email via OneSignal
   */
  async sendEmail(dto: SendEmailDto): Promise<OneSignal.CreateNotificationSuccessResponse | null> {
    if (!this.isConfigured) {
      this.logger.warn('OneSignal not configured - email not sent');
      return null;
    }

    try {
      const notification = new OneSignal.Notification();
      notification.app_id = this.appId;

      // Ciblage
      notification.include_email_tokens = dto.includeEmailTokens;

      // Contenu email
      notification.email_subject = dto.subject;
      notification.email_body = dto.body;

      if (dto.fromName) {
        notification.email_from_name = dto.fromName;
      }
      if (dto.fromAddress) {
        notification.email_from_address = dto.fromAddress;
      }
      if (dto.preheader) {
        notification.email_preheader = dto.preheader;
      }

      // Options
      if (dto.disableEmailClickTracking !== undefined) {
        notification.disable_email_click_tracking = dto.disableEmailClickTracking;
      }
      if (dto.includeUnsubscribed !== undefined) {
        notification.include_unsubscribed = dto.includeUnsubscribed;
      }

      const result = await this.client.createNotification(notification);
      this.logger.log(`Email sent to ${dto.includeEmailTokens.length} recipient(s): ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to send email', error);
      return null;
    }
  }

  /**
   * Crée ou met à jour un utilisateur OneSignal
   */
  async createOrUpdateUser(params: {
    externalId: string;
    email?: string;
    phoneNumber?: string;
    tags?: Record<string, string | number>;
  }): Promise<OneSignal.User | null> {
    if (!this.isConfigured) {
      this.logger.warn('OneSignal not configured - user not created/updated');
      return null;
    }

    try {
      const user = new OneSignal.User();

      // Identity
      user.identity = { external_id: params.externalId };

      // Subscriptions
      const subscriptions: OneSignal.Subscription[] = [];

      if (params.email) {
        subscriptions.push({ type: 'Email', token: params.email });
      }

      if (params.phoneNumber) {
        subscriptions.push({ type: 'SMS', token: params.phoneNumber });
      }

      if (subscriptions.length > 0) {
        user.subscriptions = subscriptions;
      }

      // Tags
      if (params.tags) {
        user.properties = { tags: params.tags } as any;
      }

      const result = await this.client.createUser(this.appId, user);
      this.logger.log(`User created/updated in OneSignal: ${params.externalId}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to create/update user in OneSignal', error);
      return null;
    }
  }
}
