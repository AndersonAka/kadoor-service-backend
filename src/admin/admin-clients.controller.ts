import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AdminQueryDto } from './dto/admin-query.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// import { RolesGuard } from '../auth/roles.guard';
// import { Roles } from '../auth/roles.decorator';

@ApiTags('admin')
@Controller('admin/clients')
export class AdminClientsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des clients' })
  @ApiResponse({ status: 200, description: 'Liste des clients récupérée avec succès' })
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN', 'MANAGER')
  // @ApiBearerAuth()
  async findAll(@Query() query: AdminQueryDto) {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [clients, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: clients,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer le profil détaillé d\'un client' })
  @ApiParam({ name: 'id', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Profil client récupéré avec succès' })
  async findOne(@Param('id') id: string) {
    const client = await this.prisma.user.findUnique({
      where: { id },
      include: {
        bookings: {
          include: {
            vehicle: {
              select: {
                id: true,
                title: true,
                type: true,
              },
            },
            apartment: {
              select: {
                id: true,
                title: true,
                type: true,
                city: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        reviews: {
          include: {
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
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!client) {
      throw new Error('Client non trouvé');
    }

    // Calculer les statistiques du client
    const totalSpent = client.bookings
      .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
      .reduce((sum, b) => sum + b.totalPrice, 0);

    const bookingsCount = client.bookings.length;
    const completedBookings = client.bookings.filter((b) => b.status === 'COMPLETED').length;

    return {
      ...client,
      stats: {
        totalSpent,
        bookingsCount,
        completedBookings,
        averageRating: client.reviews.length > 0
          ? client.reviews.reduce((sum, r) => sum + r.rating, 0) / client.reviews.length
          : 0,
      },
    };
  }

  @Get(':id/bookings')
  @ApiOperation({ summary: 'Récupérer l\'historique des réservations d\'un client' })
  @ApiParam({ name: 'id', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Historique des réservations récupéré avec succès' })
  async getClientBookings(@Param('id') id: string, @Query() query: AdminQueryDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId: id };
    if (status) {
      where.status = status;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicle: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
          apartment: {
            select: {
              id: true,
              title: true,
              type: true,
              city: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
