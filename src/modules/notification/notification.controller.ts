import { Controller, Get, Param, Req, UseGuards, UsePipes } from '@nestjs/common';
import { AuthRequest } from '../../dto';
import { MainValidationPipe } from '../../utils/validate';
import { JwtGuard } from '../auth/JwtGuard';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  getNotifications(@Req() req: AuthRequest) {
    return this.notificationService.getNotifications(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  readNotifications(@Req() req: AuthRequest, @Param() id: string) {
    return this.notificationService.readNotifications(id);
  }
}
