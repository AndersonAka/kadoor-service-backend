import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'znGyA5rvVjV4KCI3xXCzC++9q9yOBXLbERjnVqZkc1w=',
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
