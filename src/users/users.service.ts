import { Injectable, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface GoogleUserData {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  provider: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        provider: 'local',
      },
    });

    const { password, ...result } = user;
    return result;
  }

  /**
   * Crée un utilisateur à partir d'un compte Google
   */
  async createGoogleUser(googleUserData: GoogleUserData) {
    const user = await this.prisma.user.create({
      data: {
        email: googleUserData.email,
        firstName: googleUserData.firstName,
        lastName: googleUserData.lastName,
        googleId: googleUserData.googleId,
        avatar: googleUserData.avatar,
        provider: 'google',
        password: null, // Pas de mot de passe pour les utilisateurs OAuth
      },
    });

    console.log(`[UsersService] Created Google user: ${user.email}, id: ${user.id}`);
    return user;
  }

  /**
   * Lie un compte Google à un utilisateur existant
   */
  async linkGoogleAccount(userId: string, googleId: string, avatar?: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleId,
        avatar: avatar || undefined,
      },
    });

    console.log(`[UsersService] Linked Google account to user: ${user.email}`);
    return user;
  }

  /**
   * Trouve un utilisateur par son ID Google
   */
  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        provider: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (user) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
