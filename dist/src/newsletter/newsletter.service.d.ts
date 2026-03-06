import { PrismaService } from '../prisma/prisma.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { EmailService } from '../email/email.service';
export declare class NewsletterService {
    private prisma;
    private emailService;
    constructor(prisma: PrismaService, emailService: EmailService);
    subscribe(subscribeDto: SubscribeNewsletterDto): Promise<{
        id: string;
        email: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    unsubscribe(email: string): Promise<{
        id: string;
        email: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<{
        id: string;
        email: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    private sendWelcomeEmail;
}
