import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { ConfigService } from '../../config';

const configService = ConfigService.getInstance();
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: configService.get('FB_APP_ID'),
      clientSecret: configService.get('FB_SECRET'),
      callbackURL: configService.get('DOMAIN') + '/api/auth/v1//facebook/redirect',
      scope: ['public_profile', 'email']
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any, info?: any) => void
  ): Promise<any> {
    const { id, gender, displayName, provider } = profile;
    const user = {
      id,
      displayName,
      gender,
      provider
    };
    const payload = {
      user,
      accessToken
    };

    done(null, payload);
  }
}
