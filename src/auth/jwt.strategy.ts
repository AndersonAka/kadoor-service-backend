import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from '../users/users.service';
import { SessionsService } from './sessions.service';
import { isStaffSessionRole } from './session.constants';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET must be defined in the environment — no insecure default is allowed');
}

// Cookie httpOnly en priorité (navigateur) ; en-tête Authorization Bearer en repli
// (Swagger, Postman, clients serveur-à-serveur).
const cookieExtractor = (req: Request): string | null => req?.cookies?.access_token || null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private sessionsService: SessionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret!,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      return { userId: payload.sub, email: payload.email, role: payload.role };
    }

    if (user.isActive === false) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_DISABLED',
        message: 'Compte désactivé.',
      });
    }

    // Staff : session serveur obligatoire (idle 30 min + unicité)
    if (isStaffSessionRole(user.role)) {
      if (!payload.sid) {
        throw new UnauthorizedException({
          code: 'SESSION_REQUIRED',
          message: 'Session staff requise. Veuillez vous reconnecter.',
        });
      }
      await this.sessionsService.assertActiveAndTouch(payload.sid, user.id);
      return { ...user, sessionId: payload.sid };
    }

    return user;
  }
}
