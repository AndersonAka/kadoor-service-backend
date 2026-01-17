import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto, IncidentType } from './dto/create-incident.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class IncidentsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Crée une déclaration d'incident
   */
  async create(createIncidentDto: CreateIncidentDto, userId?: string) {
    const incident = await this.prisma.incident.create({
      data: {
        type: createIncidentDto.type,
        title: createIncidentDto.title,
        description: createIncidentDto.description,
        location: createIncidentDto.location,
        date: createIncidentDto.date ? new Date(createIncidentDto.date) : null,
        firstName: createIncidentDto.firstName,
        lastName: createIncidentDto.lastName,
        email: createIncidentDto.email,
        phone: createIncidentDto.phone,
        userId: userId || null,
        vehicleId: createIncidentDto.vehicleId || null,
        apartmentId: createIncidentDto.apartmentId || null,
        images: createIncidentDto.images || [],
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            title: true,
          },
        },
        apartment: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Envoyer l'accusé de réception par email (asynchrone, ne bloque pas la réponse)
    this.emailService
      .sendIncidentAcknowledgement(incident)
      .catch((error) => console.error('Erreur envoi email accusé de réception:', error));

    return incident;
  }

  /**
   * Récupère tous les incidents (pour les admins)
   */
  async findAll(userId?: string, status?: string) {
    const where: any = {};

    // Si un userId est fourni, filtrer par utilisateur
    if (userId) {
      where.userId = userId;
    }

    // Filtrer par statut si fourni
    if (status) {
      where.status = status;
    }

    return this.prisma.incident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            title: true,
          },
        },
        apartment: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Récupère un incident par ID
   */
  async findOne(id: string) {
    const incident = await this.prisma.incident.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            title: true,
          },
        },
        apartment: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException('Incident non trouvé');
    }

    return incident;
  }

  /**
   * Met à jour le statut d'un incident
   */
  async updateStatus(id: string, status: string) {
    const incident = await this.findOne(id);

    return this.prisma.incident.update({
      where: { id },
      data: { status: status as any },
    });
  }
}
