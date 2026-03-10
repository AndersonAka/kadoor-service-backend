export class SendEmailDto {
  /** Email addresses to send to */
  includeEmailTokens: string[];

  /** Email subject */
  subject: string;

  /** Email body (HTML) */
  body: string;

  /** Sender name (e.g., 'KADOOR SERVICE') */
  fromName?: string;

  /** Sender email address */
  fromAddress?: string;

  /** Email preheader text */
  preheader?: string;

  /** Disable click tracking */
  disableEmailClickTracking?: boolean;

  /** Include unsubscribed users */
  includeUnsubscribed?: boolean;
}
