import { Controller, Post, Body, UseGuards, Get, Request, UnauthorizedException, Res, Query } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() loginDto: LoginDto) {
    try {
      console.log(`[AuthController] Login attempt for: ${loginDto.email}`);
      const user = await this.authService.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        console.log(`[AuthController] Login failed for: ${loginDto.email}`);
        throw new UnauthorizedException('Invalid credentials');
      }
      console.log(`[AuthController] Login successful for: ${loginDto.email}`);
      const result = await this.authService.login(user);
      console.log(`[AuthController] Returning login result for: ${loginDto.email}`, JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error(`[AuthController] Error in login:`, error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Login failed');
    }
  }

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
    try {
      console.log('[AuthController] Google callback received');
      const result = await this.authService.googleLogin(req.user);
      
      // Rediriger vers le frontend avec le token
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/auth/google/callback?token=${result.access_token}`;
      
      console.log('[AuthController] Redirecting to:', redirectUrl);
      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('[AuthController] Google callback error:', error);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }
  }

  @Post('google/token')
  @ApiOperation({ summary: 'Connexion Google avec token ID (pour frontend)' })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Token invalide' })
  async googleTokenLogin(@Body('credential') credential: string) {
    try {
      console.log('[AuthController] Google token login attempt');
      
      // Décoder le token JWT Google (ID Token)
      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'));
      
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
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

      console.log('[AuthController] Google user from token:', googleUser.email);
      
      const user = await this.authService.validateGoogleUser(googleUser);
      return this.authService.login(user);
    } catch (error) {
      console.error('[AuthController] Google token login error:', error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
