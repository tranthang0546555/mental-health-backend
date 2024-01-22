import { ConfigService } from './../../config/index';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FacebookStrategy } from './FacebookStrategy';
import { JwtStrategy } from './JwtStrategy';

const configService = ConfigService.getInstance();
@Module({
  controllers: [AuthController],
  providers: [AuthService, FacebookStrategy, JwtStrategy],
  imports: [
    JwtModule.registerAsync({
      useFactory: async () => {
        return {
          signOptions: { expiresIn: '30d' },
          secret: configService.get('JWT_SECRET')
        };
      }
    })
  ]
})
export class AuthModule {}
