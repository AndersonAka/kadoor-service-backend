import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
export declare class NewsletterController {
    private readonly newsletterService;
    constructor(newsletterService: NewsletterService);
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
}
