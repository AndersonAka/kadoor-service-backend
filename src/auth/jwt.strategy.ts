import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET must be defined in the environment — no insecure default is allowed');
}

// Cookie httpOnly en priorité (navigateur) ; en-tête Authorization Bearer en repli
// (Swagger, Postman, clients serveur-à-serveur).
const cookieExtractor = (req: Request): string | null => req?.cookies?.access_token || null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret!, // non-vide garanti par le throw ci-dessus au chargement du module
    });
  }

  async validate(payload: any) {
    // Fetch full user data from database to include all fields
    const user = await this.usersService.findOne(payload.sub);
    if (user) {
      return user; // findOne already excludes password
    }
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
