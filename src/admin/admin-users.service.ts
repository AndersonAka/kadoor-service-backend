import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizePermissions, STAFF_ROLES } from '../auth/permissions';
import { CreateStaffUserDto, StaffAssignableRole } from './dto/create-staff-user.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';

const STAFF_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  permissions: true,
  isActive: true,
  mustChangePassword: true,
  provider: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  listStaff() {
    return this.prisma.user.findMany({
      where: { role: { in: [...STAFF_ROLES] as Role[] } },
      select: STAFF_SELECT,
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: { in: [...STAFF_ROLES] as Role[] } },
      select: STAFF_SELECT,
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async create(dto: CreateStaffUserDto, actorId: string) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const role = dto.role as Role;
    const permissions =
      role === StaffAssignableRole.COMMERCIAL
        ? sanitizePermissions(dto.permissions)
        : [];

    if (role === StaffAssignableRole.COMMERCIAL && permissions.length === 0) {
      throw new BadRequestException(
        'Sélectionnez au moins un module pour un compte Commercial',
      );
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashed,
        firstName: dto.firstName?.trim() || null,
        lastName: dto.lastName?.trim() || null,
        phone: dto.phone?.trim() || null,
        role,
        permissions,
        provider: 'local',
        mustChangePassword: true,
        isActive: true,
      },
      select: STAFF_SELECT,
    });

    void actorId;
    return user;
  }

  async update(id: string, dto: UpdateStaffUserDto, actorId: string) {
    const current = await this.getOne(id);

    if (id === actorId) {
      if (dto.role && dto.role !== current.role) {
        throw new ForbiddenException('Vous ne pouvez pas modifier votre propre rôle');
      }
      if (dto.isActive === false) {
        throw new ForbiddenException('Vous ne pouvez pas désactiver votre propre compte');
      }
    }

    const nextRole = (dto.role as Role | undefined) ?? current.role;
    if (
      nextRole !== Role.ADMIN &&
      nextRole !== Role.COMMERCIAL &&
      nextRole !== Role.MANAGER
    ) {
      throw new BadRequestException('Rôle non autorisé');
    }

    // On ne permet de basculer que vers ADMIN / COMMERCIAL via l’UI (MANAGER conservé tel quel).
    if (dto.role && dto.role !== StaffAssignableRole.ADMIN && dto.role !== StaffAssignableRole.COMMERCIAL) {
      throw new BadRequestException('Rôle non assignable');
    }

    let permissions = current.permissions;
    if (nextRole === Role.ADMIN) {
      permissions = [];
    } else if (nextRole === Role.COMMERCIAL) {
      if (dto.permissions !== undefined) {
        permissions = sanitizePermissions(dto.permissions);
      }
      if (permissions.length === 0) {
        throw new BadRequestException(
          'Sélectionnez au moins un module pour un compte Commercial',
        );
      }
    }

    const data: Record<string, unknown> = {
      firstName: dto.firstName !== undefined ? dto.firstName?.trim() || null : undefined,
      lastName: dto.lastName !== undefined ? dto.lastName?.trim() || null : undefined,
      phone: dto.phone !== undefined ? dto.phone?.trim() || null : undefined,
      isActive: dto.isActive,
      role: dto.role,
      permissions,
    };

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
      data.mustChangePassword = true;
    }

    // Retirer les undefined pour Prisma
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    return this.prisma.user.update({
      where: { id },
      data,
      select: STAFF_SELECT,
    });
  }

  async remove(id: string, actorId: string) {
    if (id === actorId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte');
    }
    await this.getOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
