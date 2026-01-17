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
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
    }>;
    unsubscribe(email: string): Promise<{
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
    }>;
    findAll(): Promise<{
        id: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
    }[]>;
    private sendWelcomeEmail;
}
