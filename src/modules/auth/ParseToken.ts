import { JwtService } from '@nestjs/jwt/dist';
import { Request } from 'express';
import { ConfigService } from '../../config';

export const parseToken = async (req: Request) => {
  const token = req.headers.authorization.split(' ').pop();
  // console.log('token', token)
  if (token === 'null' || token === 'Bearer') return undefined;

  const decode = await new JwtService().verifyAsync(token, {
    ignoreExpiration: false,
    secret: ConfigService.getInstance().get('JWT_SECRET')
  });

  return { userId: decode?.id };
};
