import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || '';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || '';
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3001/api/auth/google/callback';
    
    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, name, emails, photos } = profile;
    
    const googleUser = {
      googleId: id,
      email: emails?.[0]?.value || '',
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
      avatar: photos?.[0]?.value || undefined,
      provider: 'google',
    };

    console.log('[GoogleStrategy] Google user profile:', googleUser);

    try {
      const user = await this.authService.validateGoogleUser(googleUser);
      done(undefined, user);
    } catch (error) {
      console.error('[GoogleStrategy] Error validating Google user:', error);
      done(error as Error, undefined);
    }
  }
}
