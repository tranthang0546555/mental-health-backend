import { ExtractJwt, Strategy as PassportJwtStrategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '../../config';
import { AuthPayload } from '../../dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(PassportJwtStrategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: ConfigService.getInstance().get('JWT_SECRET')
    });
  }

  async validate(payload: AuthPayload) {
    // console.log('payload', payload)
    return { id: payload.id, role: payload.role };
  }
}
