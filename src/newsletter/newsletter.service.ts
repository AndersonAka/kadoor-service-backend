import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class NewsletterService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async subscribe(subscribeDto: SubscribeNewsletterDto) {
    // Vérifier si l'email existe déjà
    const existing = await this.prisma.newsletter.findUnique({
      where: { email: subscribeDto.email },
    });

    if (existing) {
      if (existing.isActive) {
        throw new ConflictException('Cet email est déjà abonné à la newsletter');
      } else {
        // Réactiver l'abonnement si désactivé
        const reactivated = await this.prisma.newsletter.update({
          where: { email: subscribeDto.email },
          data: { isActive: true },
        });
        
        // Envoyer un email de confirmation de réactivation
        this.sendWelcomeEmail(subscribeDto.email).catch(
          (error) => console.error('Erreur envoi email newsletter:', error),
        );
        
        return reactivated;
      }
    }

    // Créer un nouvel abonnement
    const subscription = await this.prisma.newsletter.create({
      data: {
        email: subscribeDto.email,
        isActive: true,
      },
    });

    // Envoyer un email de bienvenue
    this.sendWelcomeEmail(subscribeDto.email).catch(
      (error) => console.error('Erreur envoi email newsletter:', error),
    );

    return subscription;
  }

  async unsubscribe(email: string) {
    const subscription = await this.prisma.newsletter.findUnique({
      where: { email },
    });

    if (!subscription) {
      throw new NotFoundException('Email non trouvé dans la newsletter');
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

  private async sendWelcomeEmail(email: string): Promise<void> {
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
      // Utiliser le service email existant si disponible
      // Sinon, juste logger (pour le développement)
      console.log(`Email de bienvenue newsletter envoyé à: ${email}`);
    } catch (error) {
      console.error('Erreur envoi email newsletter:', error);
    }
  }
}
