"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsletterService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const email_service_1 = require("../email/email.service");
let NewsletterService = class NewsletterService {
    prisma;
    emailService;
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
    }
    async subscribe(subscribeDto) {
        const existing = await this.prisma.newsletter.findUnique({
            where: { email: subscribeDto.email },
        });
        if (existing) {
            if (existing.isActive) {
                throw new common_1.ConflictException('Cet email est déjà abonné à la newsletter');
            }
            else {
                const reactivated = await this.prisma.newsletter.update({
                    where: { email: subscribeDto.email },
                    data: { isActive: true },
                });
                this.sendWelcomeEmail(subscribeDto.email).catch((error) => console.error('Erreur envoi email newsletter:', error));
                return reactivated;
            }
        }
        const subscription = await this.prisma.newsletter.create({
            data: {
                email: subscribeDto.email,
                isActive: true,
            },
        });
        this.sendWelcomeEmail(subscribeDto.email).catch((error) => console.error('Erreur envoi email newsletter:', error));
        return subscription;
    }
    async unsubscribe(email) {
        const subscription = await this.prisma.newsletter.findUnique({
            where: { email },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Email non trouvé dans la newsletter');
        }
        return this.prisma.newsletter.update({
            where: { email },
            data: { isActive: false },
        });
    }
    async findAll() {
        return this.prisma.newsletter.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async sendWelcomeEmail(email) {
        const subject = 'Bienvenue dans la newsletter KADOOR SERVICE';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #354765;">Bienvenue dans la newsletter KADOOR SERVICE !</h2>
        <p>Merci de vous être abonné à notre newsletter. Vous recevrez désormais nos dernières actualités, offres spéciales et promotions.</p>
        <p>Restez connecté pour découvrir nos nouveaux véhicules, appartements et services.</p>
        <p>L'équipe KADOOR SERVICE</p>
      </div>
    `;
        try {
            console.log(`Email de bienvenue newsletter envoyé à: ${email}`);
        }
        catch (error) {
            console.error('Erreur envoi email newsletter:', error);
        }
    }
};
exports.NewsletterService = NewsletterService;
exports.NewsletterService = NewsletterService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], NewsletterService);
//# sourceMappingURL=newsletter.service.js.map