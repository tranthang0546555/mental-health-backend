import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  Post,
  Query,
  Req,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes
} from '@nestjs/common';
import { Param } from '@nestjs/common/decorators';

import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { glob } from 'glob';
import { diskStorage } from 'multer';
import { AuthRequest } from '../../dto';
import { MainValidationPipe } from '../../utils/validate';
import { JwtGuard } from './JwtGuard';
import { AuthService } from './auth.service';
import { AccountChangePasswordDto, AccountDto, ProfileUpdateDto, VerifyEmailDto } from './dto';
import { unlink } from 'node:fs/promises';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get('/facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookLogin(): Promise<any> {
    return HttpStatus.OK;
  }

  @Get('/facebook/redirect')
  @UseGuards(AuthGuard('facebook'))
  async facebookLoginRedirect(@Req() req: any): Promise<any> {
    const user = req.user;
    return this.authService.loginFB(user.user.id, undefined);
  }

  @Get('profile')
  @UseGuards(JwtGuard)
  getProfile(@Req() req: AuthRequest) {
    return this.authService.getProfile(req.user.id);
  }

  @Patch('profile')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  updateProfile(@Req() req: AuthRequest, @Body() body: ProfileUpdateDto) {
    return this.authService.updateProfile(req.user.id, body);
  }

  @Post('change-avatar')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './src/public/avatars',
        filename: async (req: AuthRequest, file, cb) => {
          const userId = req.user.id;
          const randNumber = Math.round(Math.random() * 1000000).toString();
          const files = await glob('**/avatars/' + userId + '*.jpg');
          for (const file of files) {
            unlink(file);
          }
          cb(null, userId + '-' + randNumber + '.jpg');
        }
      }),
      fileFilter(req, file, callback) {
        const fileValid = ['image/gif', 'image/jpeg', 'image/png'];
        // console.log('fileValid', fileValid, file.mimetype);
        if (!fileValid.includes(file.mimetype)) callback(new UnsupportedMediaTypeException('File không hợp lệ'), false);
        else callback(null, true);
      }
    })
  )
  changeAvatar(@Req() req: AuthRequest, @UploadedFile() file: Express.Multer.File) {
    return this.authService.changeAvatar(req.user.id, file.filename);
  }

  @Post('register')
  @UsePipes(new MainValidationPipe())
  register(@Body() body: AccountDto) {
    return this.authService.register(body);
  }

  @Get('account-active/:email')
  accountActive(@Param('email') email: string) {
    return this.authService.accountActive(email);
  }

  @Get('verify-email')
  @UsePipes(new MainValidationPipe())
  verifyEmail(@Query() query: VerifyEmailDto) {
    return this.authService.verifyEmail(query.token);
  }

  @Post('login')
  @UsePipes(new MainValidationPipe())
  login(@Body() body: AccountDto) {
    return this.authService.login(body);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('change-password')
  @UsePipes(new MainValidationPipe())
  changePassword(@Body() body: AccountChangePasswordDto) {
    return this.authService.changePassword(body);
  }
}
