import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, UsePipes } from '@nestjs/common';
import { Role } from '../../constants';
import { Roles } from '../../decorator/roles.decorator';
import { MainValidationPipe } from '../../utils/validate';
import { JwtGuard } from '../auth/JwtGuard';
import { RolesGuard } from '../auth/RolesGuard';
import { AuthRequest, Pagination, TimeLineDto } from './../../dto/index';
import {
  CancelScheduleDto,
  PatientRegistrationDto,
  PatientRegistrationStatusDto,
  SetDoctorScheduleDto,
  VerifyDto
} from './dto';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post('patient-registration')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  patientRegistration(@Body() body: PatientRegistrationDto, @Req() req: AuthRequest) {
    return this.scheduleService.patientRegistration(req.user.id, body);
  }

  @Get('not-yet')
  @Roles(Role.AS)
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  getNotYetSchedules(@Query() query: Pagination) {
    return this.scheduleService.getNotYetSchedules(query);
  }

  @Patch('cancel/:id')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  cancelSchedule(@Param() id: string, @Req() req: AuthRequest, @Body() body: CancelScheduleDto) {
    return this.scheduleService.cancelSchedule(id, req.user, body);
  }

  @Patch('set-doctor/:id')
  @Roles(Role.AS, Role.DOCTOR)
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  setSchedule(@Param() id: string, @Req() req: AuthRequest, @Body() body: SetDoctorScheduleDto) {
    return this.scheduleService.setDoctorForSchedule(id, req.user.id, body);
  }

  @Post('rating/:id')
  rating(@Body() body: { rating: number }, @Req() req: AuthRequest, @Param('id') id: string) {
    return this.scheduleService.rating(id, body.rating);
  }

  @Get('booked/:id')
  booked(@Param('id') id: string) {
    return this.scheduleService.booked(id);
  }

  @Get('patient-registration')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  getAll(@Query() input: PatientRegistrationStatusDto, @Req() req: AuthRequest) {
    return this.scheduleService.getAll(req.user.id, req.user.role, input);
  }

  @Get('room-access/:id')
  @Roles(Role.USER, Role.DOCTOR, Role.OSS)
  @UseGuards(JwtGuard, RolesGuard)
  roomAccess(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.scheduleService.roomAccess(req.user.id, id, req.user.role === Role.OSS);
  }

  @Get('chart/all')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  schedulesChart(@Req() req: AuthRequest, @Query() query: TimeLineDto) {
    return this.scheduleService.schedulesChart(req.user.id, req.user.role, query);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  getSchedule(@Param('id') id: string) {
    return this.scheduleService.getSchedule(id);
  }

  @Patch(':id')
  @Roles(Role.DOCTOR)
  @UseGuards(JwtGuard)
  updateSchedule(@Param('id') id: string, @Body() body: VerifyDto, @Req() req: AuthRequest) {
    return this.scheduleService.updateSchedule(id, body);
  }

  @Get('write/:id')
  @UseGuards(JwtGuard)
  writeMedicalRecord(@Param('id') id: string) {
    return this.scheduleService.writeMedicalRecord(id);
  }
}
