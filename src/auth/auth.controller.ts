import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  UnauthorizedException,
  Res,
  Query,
  Patch,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { SessionsService } from './sessions.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { isStaffSessionRole } from './session.constants';

const AUTH_THROTTLE = { default: { limit: 5, ttl: 60000 } };

const AUTH_COOKIE_NAME = 'access_token';
const AUTH_COOKIE_MAX_AGE_CLIENT = 24 * 60 * 60 * 1000;
const AUTH_COOKIE_MAX_AGE_STAFF = 8 * 60 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private configService: ConfigService,
    private jwtService: JwtService,
    private sessionsService: SessionsService,
  ) {}

  private clientMeta(req: ExpressRequest) {
    const forwarded = req.headers['x-forwarded-for'];
    const ipFromForwarded = Array.isArray(forwarded)
      ? forwarded[0]
      : typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : undefined;
    return {
      userAgent: req.headers['user-agent'] || null,
      ip: ipFromForwarded || req.ip || null,
    };
  }

  private setAuthCookie(res: Response, token: string, staff: boolean) {
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: staff ? AUTH_COOKIE_MAX_AGE_STAFF : AUTH_COOKIE_MAX_AGE_CLIENT,
      path: '/',
    });
  }

  private clearAuthCookie(res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
  }

  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  @ApiResponse({ status: 409, description: 'Session staff déjà active ailleurs' })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const user = await this.authService.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }
      const result = await this.authService.login(user, {
        force: !!loginDto.force,
        meta: this.clientMeta(req),
      });
      this.setAuthCookie(res, result.access_token, isStaffSessionRole(user.role));
      return { user: result.user };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      console.error(`[AuthController] Error in login:`, error);
      throw new UnauthorizedException('Login failed');
    }
  }

  @Post('logout')
  @ApiOperation({ summary: 'Déconnexion (révoque la session staff si possible + efface le cookie)' })
  async logout(@Request() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[AUTH_COOKIE_NAME];
    if (raw) {
      try {
        const payload = this.jwtService.verify(raw) as { sub?: string; sid?: string };
        if (payload?.sub && payload?.sid) {
          await this.authService.logoutSession(payload.sub, payload.sid);
        }
      } catch {
        /* cookie déjà invalide — on nettoie quand même */
      }
    }
    this.clearAuthCookie(res);
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('session/touch')
  @ApiOperation({ summary: 'Prolonge la session staff (reste connecté)' })
  async touchSession(@Request() req: any) {
    if (!isStaffSessionRole(req.user?.role) || !req.user?.sessionId) {
      return { success: true, staff: false };
    }
    await this.sessionsService.touch(req.user.sessionId, req.user.id);
    return { success: true, staff: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('session/logout-all')
  @ApiOperation({ summary: 'Révoque toutes les sessions staff du compte' })
  async logoutAll(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    if (isStaffSessionRole(req.user?.role)) {
      await this.authService.logoutAllSessions(req.user.id);
    }
    this.clearAuthCookie(res);
    return { success: true };
  }

  @Throttle(AUTH_THROTTLE)
  @Post('session-from-token')
  @ApiOperation({
    summary: "Échange un JWT (reçu en query string, ex: callback OAuth) contre un cookie de session",
  })
  @ApiResponse({ status: 200, description: 'Session établie' })
  @ApiResponse({ status: 401, description: 'Token invalide ou expiré' })
  async sessionFromToken(
    @Body('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }
    try {
      const payload = this.jwtService.verify(token) as { sub: string; sid?: string; role?: string };
      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Utilisateur introuvable');
      }
      // Staff : le JWT doit déjà contenir un sid créé au login Google
      if (isStaffSessionRole(user.role) && !payload.sid) {
        throw new UnauthorizedException({
          code: 'SESSION_REQUIRED',
          message: 'Session staff requise. Veuillez vous reconnecter.',
        });
      }
      this.setAuthCookie(res, token, isStaffSessionRole(user.role));
      return { user };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @ApiOperation({ summary: 'Inscription utilisateur' })
  @ApiResponse({ status: 201, description: 'Inscription réussie' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiOperation({ summary: 'Récupérer le profil utilisateur' })
  getProfile(@Request() req: any) {
    return req.user;
  }

  // ==================== GOOGLE OAUTH ====================

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initier la connexion Google OAuth' })
  async googleAuth() {
    // Le guard redirige vers Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback Google OAuth' })
  async googleAuthRedirect(@Request() req: any, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    try {
      const result = await this.authService.googleLogin(req.user, {
        force: false,
        meta: this.clientMeta(req),
      });
      const redirectUrl = `${frontendUrl}/auth/google/callback?token=${result.access_token}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      if (error instanceof ConflictException) {
        return res.redirect(`${frontendUrl}/login?error=session_exists`);
      }
      console.error('[AuthController] Google callback error:', error);
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }

  @Throttle(AUTH_THROTTLE)
  @Post('google/token')
  @ApiOperation({ summary: 'Connexion Google avec token ID (pour frontend)' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Token invalide' })
  @ApiResponse({ status: 409, description: 'Session staff déjà active ailleurs' })
  async googleTokenLogin(
    @Body() body: { credential: string; force?: boolean },
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      if (!clientId) {
        throw new UnauthorizedException('Google OAuth not configured');
      }
      if (!body?.credential) {
        throw new UnauthorizedException('No credential provided');
      }

      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: body.credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();

      const googleUser = {
        googleId: payload.sub,
        email: payload.email,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
        avatar: payload.picture || null,
        provider: 'google',
      };

      const user = await this.authService.validateGoogleUser(googleUser);
      const result = await this.authService.login(user, {
        force: !!body.force,
        meta: this.clientMeta(req),
      });
      this.setAuthCookie(res, result.access_token, isStaffSessionRole(user.role));
      return { user: result.user };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('[AuthController] Google token login error:', error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  // ==================== PROFILE MANAGEMENT ====================

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  @ApiOperation({ summary: 'Mettre à jour le profil utilisateur' })
  @ApiResponse({ status: 200, description: 'Profil mis à jour' })
  async updateProfile(
    @Request() req: any,
    @Body() updateData: { firstName?: string; lastName?: string; phone?: string; address?: string },
  ) {
    const updatedUser = await this.usersService.update(req.user.id, updateData);
    const { password, ...result } = updatedUser;
    return result;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('change-password')
  @ApiOperation({ summary: 'Changer le mot de passe' })
  @ApiResponse({ status: 200, description: 'Mot de passe changé' })
  @ApiResponse({ status: 400, description: 'Mot de passe actuel incorrect' })
  async changePassword(@Request() req: any, @Body() body: ChangePasswordDto) {
    const result = await this.authService.changePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
    );
    if (!result.success) {
      throw new BadRequestException(result.message);
    }
    return { message: 'Password changed successfully' };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('deactivate-account')
  @ApiOperation({ summary: 'Désactiver le compte (soft delete)' })
  @ApiResponse({ status: 200, description: 'Compte désactivé' })
  async deactivateAccount(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    if (isStaffSessionRole(req.user?.role) && req.user?.sessionId) {
      await this.authService.logoutSession(req.user.id, req.user.sessionId);
    }
    await this.authService.deactivateAccount(req.user.id);
    this.clearAuthCookie(res);
    return { message: 'Account deactivated successfully' };
  }

  // ==================== PASSWORD RESET ====================

  @Throttle(AUTH_THROTTLE)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Demander la réinitialisation du mot de passe' })
  @ApiResponse({ status: 200, description: 'Email de réinitialisation envoyé' })
  async forgotPassword(@Body() body: { email: string }) {
    if (!body.email) {
      throw new BadRequestException('Email is required');
    }
    return this.authService.forgotPassword(body.email);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('reset-password')
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec le token' })
  @ApiResponse({ status: 200, description: 'Mot de passe réinitialisé' })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré' })
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    if (!body.token || !body.newPassword) {
      throw new BadRequestException('Token and new password are required');
    }
    if (body.newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Get('verify-reset-token')
  @ApiOperation({ summary: 'Vérifier si le token de réinitialisation est valide' })
  @ApiResponse({ status: 200, description: 'Statut du token' })
  async verifyResetToken(@Query('token') token: string) {
    if (!token) {
      return { valid: false };
    }
    return this.authService.verifyResetToken(token);
  }
}
