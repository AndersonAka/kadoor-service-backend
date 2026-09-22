import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ListingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';

export type ListingKind = 'vehicle' | 'apartment';

const KIND_LABEL: Record<ListingKind, { fr: string; en: string; adminPath: string }> = {
  vehicle: { fr: 'véhicule', en: 'vehicle', adminPath: '/admin/vehicles' },
  apartment: { fr: 'logement', en: 'property', adminPath: '/admin/apartments' },
};

/**
 * Règles communes à la modération des biens (véhicules / logements) :
 * un bien soumis par un partenaire loueur reste PENDING (invisible du public) jusqu'à
 * sa validation par un admin ; le partenaire est notifié de la décision.
 */
@Injectable()
export class ListingModerationService {
  private readonly logger = new Logger(ListingModerationService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: InAppNotificationsService,
  ) {}

  /** Le partenaire rattaché par l'admin doit exister et louer ce type de bien (sinon erreur FK 500 ou incohérence). */
  async assertOwnerPartner(partnerId: string | null | undefined, kind: ListingKind) {
    if (!partnerId) return;
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      select: { category: true },
    });
    if (!partner) throw new BadRequestException('Partenaire propriétaire introuvable.');
    const expected = kind === 'vehicle' ? 'AUTO' : 'APARTMENT';
    if (partner.category !== 'BOTH' && partner.category !== expected) {
      throw new BadRequestException(
        kind === 'vehicle'
          ? "Ce partenaire n'est pas enregistré pour la location de véhicules."
          : "Ce partenaire n'est pas enregistré pour la location de logements.",
      );
    }
  }

  /** Décision admin : motif obligatoire au refus, effacé sinon. Le motif seul (sans statut) est ignoré. */
  normalizeStatusChange(dto: { status?: ListingStatus; rejectionReason?: string | null }) {
    if (dto.status === undefined) {
      delete dto.rejectionReason;
      return;
    }
    if (dto.status === 'REJECTED') {
      const reason = dto.rejectionReason?.trim();
      if (!reason) throw new BadRequestException('Le motif du refus est obligatoire : il est transmis au partenaire.');
      dto.rejectionReason = reason;
    } else {
      dto.rejectionReason = null;
    }
  }

  /** Notifie le partenaire propriétaire quand un admin valide ou refuse son bien. Ne bloque jamais la décision. */
  async notifyPartnerDecision(
    kind: ListingKind,
    listing: { title: string; partnerId: string | null; status: ListingStatus; rejectionReason: string | null },
    previousStatus: ListingStatus,
  ) {
    if (!listing.partnerId || listing.status === previousStatus || listing.status === 'PENDING') return;
    try {
      const partner = await this.prisma.partner.findUnique({
        where: { id: listing.partnerId },
        select: { userId: true },
      });
      if (!partner?.userId) return;
      const label = KIND_LABEL[kind];
      const approved = listing.status === 'APPROVED';
      await this.notifications.createNotification({
        type: 'SYSTEM',
        userId: partner.userId,
        titleFr: approved ? `Votre ${label.fr} est en ligne` : `Votre ${label.fr} n'a pas été validé`,
        titleEn: approved ? `Your ${label.en} is live` : `Your ${label.en} was not approved`,
        messageFr: approved
          ? `« ${listing.title} » a été validé par Kadoor Service et est désormais visible par les clients.`
          : `« ${listing.title} » a été refusé. Motif : ${listing.rejectionReason}. Vous pouvez le modifier puis le soumettre à nouveau.`,
        messageEn: approved
          ? `"${listing.title}" was approved by Kadoor Service and is now visible to customers.`
          : `"${listing.title}" was rejected. Reason: ${listing.rejectionReason}. You can edit it and submit it again.`,
        link: '/espace-partenaire/biens',
      });
    } catch (error) {
      this.logger.error(`Notification partenaire impossible (${kind} « ${listing.title} »)`, error as Error);
    }
  }

  /** Prévient les admins qu'un bien attend leur validation. Ne bloque jamais la soumission. */
  async notifyAdminsSubmission(kind: ListingKind, title: string, partnerName: string, resubmission = false) {
    const label = KIND_LABEL[kind];
    try {
      await this.notifications.createAdminBroadcast({
        titleFr: resubmission ? `${capitalize(label.fr)} modifié à revalider` : `Nouveau ${label.fr} à valider`,
        titleEn: resubmission ? `Updated ${label.en} to review` : `New ${label.en} to review`,
        messageFr: `${partnerName} a ${resubmission ? 'modifié' : 'soumis'} « ${title} ». Il restera invisible du public jusqu'à votre validation.`,
        messageEn: `${partnerName} ${resubmission ? 'updated' : 'submitted'} "${title}". It stays hidden from the public until you approve it.`,
        link: `${label.adminPath}?validation=PENDING`,
      });
    } catch (error) {
      this.logger.error(`Notification admin impossible (${kind} « ${title} »)`, error as Error);
    }
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
