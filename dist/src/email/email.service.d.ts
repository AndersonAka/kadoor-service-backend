import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private configService;
    private transporter;
    constructor(configService: ConfigService);
    sendReservationConfirmation(booking: any, userEmail: string): Promise<void>;
    sendPaymentConfirmation(booking: any, userEmail: string): Promise<void>;
    sendContract(booking: any, userEmail: string, contractBuffer: Buffer): Promise<void>;
    sendIncidentAcknowledgement(incident: any): Promise<void>;
    private sendEmail;
    private getEmailTemplate;
}
