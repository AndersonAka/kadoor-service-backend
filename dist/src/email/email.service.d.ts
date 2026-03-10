import { ConfigService } from '@nestjs/config';
import { OneSignalService } from '../notifications/onesignal.service';
export declare class EmailService {
    private readonly oneSignalService;
    private readonly configService;
    private readonly logger;
    private readonly fromName;
    private readonly fromAddress;
    private readonly frontendUrl;
    constructor(oneSignalService: OneSignalService, configService: ConfigService);
    sendReservationConfirmation(booking: any, userEmail: string): Promise<void>;
    sendPaymentConfirmation(booking: any, userEmail: string): Promise<void>;
    sendContract(booking: any, userEmail: string): Promise<void>;
    sendWelcomeEmail(userEmail: string, firstName: string): Promise<void>;
    sendCancellationEmail(booking: any, userEmail: string): Promise<void>;
    sendIncidentAcknowledgement(incident: any): Promise<void>;
    private sendEmail;
    private getEmailTemplate;
}
