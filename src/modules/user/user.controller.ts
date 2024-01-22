import { Controller, Get, Query, UseGuards, UsePipes, Param, Req, Patch, Body } from '@nestjs/common';
import { Role } from '../../constants';
import { Roles } from '../../decorator/roles.decorator';
import { MainValidationPipe } from '../../utils/validate';
import { JwtGuard } from '../auth/JwtGuard';
import { RolesGuard } from '../auth/RolesGuard';
import { RoleRequestDto, UserRequestDto } from './dto';
import { UserService } from './user.service';
import { AuthRequest } from '../../dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @UsePipes(new MainValidationPipe())
  getAll(@Query() query: UserRequestDto) {
    return this.userService.getAll(query);
  }

  @Patch('lock/:id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @UsePipes(new MainValidationPipe())
  lockUserAccount(@Param() userId: string, @Req() req: AuthRequest, @Body() { message }: { message: string }) {
    return this.userService.lockUserAccount(userId, req.user.id, message);
  }

  @Get('locked')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @UsePipes(new MainValidationPipe())
  getLockedUsers(@Query() query: UserRequestDto) {
    return this.userService.getLockedUsers(query);
  }

  @Patch('unlock/:id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @UsePipes(new MainValidationPipe())
  unlockUserAccount(@Param() userId: string, @Req() req: AuthRequest) {
    const adminId = req.user.id;
    return this.userService.unlockUserAccount(userId, adminId);
  }

  @Patch('set-role/:id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @UsePipes(new MainValidationPipe())
  setRoleAccount(@Param() userId: string, @Req() req: AuthRequest, @Body() body: RoleRequestDto) {
    const adminId = req.user.id;
    return this.userService.setRoleAccount(userId, adminId, body.role);
  }
}
