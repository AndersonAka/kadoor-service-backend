import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

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
    
    const { password, ...result } = user;
    console.log(`[AuthService] User validated successfully: ${email}, role: ${user.role}`);
    return result;
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

  async login(user: any) {
    try {
      console.log(`[AuthService] Generating token for user: ${user.email}, id: ${user.id}`);
      const payload = { email: user.email, sub: user.id, role: user.role, userId: user.id };
      const token = this.jwtService.sign(payload);
      console.log(`[AuthService] Token generated successfully`);
      return {
        access_token: token,
        user: user
      };
    } catch (error) {
      console.error(`[AuthService] Error generating token:`, error);
      throw new UnauthorizedException('Failed to generate token');
    }
  }

  /**
   * Login pour utilisateur Google (après validation OAuth)
   */
  async googleLogin(user: any) {
    if (!user) {
      throw new UnauthorizedException('No user from Google');
    }
    return this.login(user);
  }
}
