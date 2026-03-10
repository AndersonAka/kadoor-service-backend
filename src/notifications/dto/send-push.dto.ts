export class SendPushDto {
  /** Segments to target (e.g., ['Subscribed Users']) */
  includedSegments?: string[];

  /** Subscription IDs to target */
  includeSubscriptionIds?: string[];

  /** Aliases to target (external_id) */
  includeAliases?: { external_id: string[] };

  /** Notification content (multi-language) */
  contents: { en: string; fr?: string };

  /** Notification headings (multi-language) */
  headings?: { en: string; fr?: string };

  /** Subtitle (iOS) */
  subtitle?: { en: string; fr?: string };

  /** URL to open on click */
  url?: string;

  /** Custom data payload */
  data?: Record<string, any>;

  /** Big picture URL (Android) */
  bigPicture?: string;

  /** Target iOS */
  isIos?: boolean;

  /** Target Android */
  isAndroid?: boolean;

  /** Target Web */
  isAnyWeb?: boolean;
}
