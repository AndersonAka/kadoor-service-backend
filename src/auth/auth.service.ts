import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SessionsService, SessionMeta } from './sessions.service';
import { isStaffSessionRole, STAFF_JWT_EXPIRES_IN } from './session.constants';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface GoogleUserDto {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  provider: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private prisma: PrismaService,
    private sessionsService: SessionsService,
    private audit: AuditService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      console.log(`[AuthService] User not found: ${email}`);
      return null;
    }
    
    // Vérifier si l'utilisateur a un mot de passe (utilisateurs locaux uniquement)
    if (!user.password) {
      console.log(`[AuthService] User ${email} registered with OAuth, cannot login with password`);
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      console.log(`[AuthService] Invalid password for user: ${email}`);
      return null;
    }

    // Réactiver le compte si désactivé (l'utilisateur qui se reconnecte)
    if (user.isActive === false) {
      console.log(`[AuthService] Reactivating account for user: ${email}`);
      await this.usersService.update(user.id, { isActive: true });
    }
    
    const { password, ...result } = user;
    console.log(`[AuthService] User validated successfully: ${email}, role: ${user.role}`);
    return { ...result, isActive: true };
  }

  /**
   * Valide ou crée un utilisateur Google
   */
  async validateGoogleUser(googleUser: GoogleUserDto): Promise<any> {
    console.log(`[AuthService] Validating Google user: ${googleUser.email}`);
    
    // Chercher l'utilisateur par googleId
    let user = await this.usersService.findByGoogleId(googleUser.googleId);
    
    if (user) {
      console.log(`[AuthService] Found existing Google user: ${user.email}`);
      const { password, ...result } = user;
      return result;
    }
    
    // Chercher l'utilisateur par email (peut avoir un compte local existant)
    user = await this.usersService.findByEmail(googleUser.email);
    
    if (user) {
      // Lier le compte Google à l'utilisateur existant
      console.log(`[AuthService] Linking Google account to existing user: ${user.email}`);
      user = await this.usersService.linkGoogleAccount(user.id, googleUser.googleId, googleUser.avatar);
      const { password, ...result } = user;
      return result;
    }
    
    // Créer un nouvel utilisateur
    console.log(`[AuthService] Creating new Google user: ${googleUser.email}`);
    user = await this.usersService.createGoogleUser(googleUser);
    const { password, ...result } = user;
    return result;
  }

  /**
   * Émet un JWT. Pour le staff : session exclusive (sid) + TTL 8h.
   * @throws ConflictException SESSION_EXISTS si une autre session est active et force=false
   */
  async login(
    user: any,
    options: { force?: boolean; meta?: SessionMeta } = {},
  ) {
    try {
      console.log(`[AuthService] Generating token for user: ${user.email}, id: ${user.id}`);
      const payload: Record<string, unknown> = {
        email: user.email,
        sub: user.id,
        role: user.role,
        userId: user.id,
        permissions: user.permissions || [],
      };

      if (isStaffSessionRole(user.role)) {
        const opened = await this.sessionsService.openExclusiveSession(
          user.id,
          options.meta || {},
          !!options.force,
        );
        if (opened.conflict) {
          throw new ConflictException({
            code: 'SESSION_EXISTS',
            message:
              'Ce compte est déjà connecté sur un autre navigateur ou appareil.',
            existingSession: opened.existing,
          });
        }
        payload.sid = opened.session.id;

        await this.audit.record({
          action: options.force ? 'session.takeover' : 'session.created',
          entityType: 'UserSession',
          entityId: opened.session.id,
          actorId: user.id,
          actorEmail: user.email,
          actorRole: user.role,
          outcome: 'SUCCESS',
          source: 'API',
          summary: options.force
            ? `Prise de session staff (${user.email}) — autres déconnectés`
            : `Session staff ouverte (${user.email})`,
          metadata: {
            role: user.role,
            ip: options.meta?.ip,
            userAgent: options.meta?.userAgent,
          },
          ipAddress: options.meta?.ip || undefined,
          userAgent: options.meta?.userAgent || undefined,
        });

        const staffToken = this.jwtService.sign(payload, {
          expiresIn: STAFF_JWT_EXPIRES_IN as `${number}h`,
        });
        console.log(`[AuthService] Token generated successfully`);
        return { access_token: staffToken, user };
      }

      const token = this.jwtService.sign(payload);
      console.log(`[AuthService] Token generated successfully`);
      return {
        access_token: token,
        user,
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      console.error(`[AuthService] Error generating token:`, error);
      throw new UnauthorizedException('Failed to generate token');
    }
  }

  /**
   * Login pour utilisateur Google (après validation OAuth)
   */
  async googleLogin(
    user: any,
    options: { force?: boolean; meta?: SessionMeta } = {},
  ) {
    if (!user) {
      throw new UnauthorizedException('No user from Google');
    }
    return this.login(user, options);
  }

  async logoutSession(userId: string | undefined, sessionId: string | undefined) {
    if (userId && sessionId) {
      await this.sessionsService.revokeSession(sessionId, 'LOGOUT');
      await this.audit.record({
        action: 'session.logout',
        entityType: 'UserSession',
        entityId: sessionId,
        actorId: userId,
        outcome: 'SUCCESS',
        source: 'API',
        summary: 'Déconnexion staff',
      });
    }
  }

  async logoutAllSessions(userId: string) {
    await this.sessionsService.revokeAllForUser(userId, 'LOGOUT_ALL');
    await this.audit.record({
      action: 'session.logout_all',
      entityType: 'User',
      entityId: userId,
      actorId: userId,
      outcome: 'SUCCESS',
      source: 'API',
      summary: 'Déconnexion de toutes les sessions staff',
    });
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findByEmail(
      (await this.usersService.findOne(userId))?.email || ''
    );
    
    if (!user) {
      return { success: false, message: 'Utilisateur introuvable.' };
    }

    // Check if user has a password (OAuth users don't)
    if (!user.password) {
      return { success: false, message: 'Ce compte se connecte via Google : aucun mot de passe à modifier.' };
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return { success: false, message: 'Le mot de passe actuel est incorrect.' };
    }

    // Un mot de passe provisoire communiqué par un admin ne doit pas être « changé » pour lui-même.
    if (await bcrypt.compare(newPassword, user.password)) {
      return { success: false, message: "Le nouveau mot de passe doit être différent de l'actuel." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Deactivate user account (soft delete)
   */
  async deactivateAccount(userId: string) {
    await this.usersService.update(userId, { isActive: false });
    return { success: true };
  }

  /**
   * Request password reset - sends email with reset link
   */
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      // Don't reveal if user exists
      return { success: true, message: 'If this email exists, a reset link has been sent' };
    }

    // Check if user uses OAuth (no password to reset)
    if (user.provider === 'google' && !user.password) {
      return { success: true, message: 'If this email exists, a reset link has been sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    // Save token to database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires,
      },
    });

    // Send reset email
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Client';
    await this.emailService.sendPasswordResetEmail(user.email, userName, resetToken);

    return { success: true, message: 'If this email exists, a reset link has been sent' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    // Find user with valid token
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { success: true, message: 'Password reset successfully' };
  }

  /**
   * Verify reset token is valid
   */
  async verifyResetToken(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    return { valid: !!user };
  }
}
