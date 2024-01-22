import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards, UsePipes } from '@nestjs/common';
import { MainValidationPipe } from '../../utils/validate';
import { JwtGuard } from '../auth/JwtGuard';
import { PostRequestDto } from '../post/dto';
import { AuthRequest } from './../../dto/index';
import { DoctorService } from './doctor.service';
import { DoctorRequestDto, TimeServingCreateDto, TimeServingDeleteDto, WorkingRoomsCreateDto } from './dto';

@Controller('doctor')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}
  @Get()
  @UsePipes(new MainValidationPipe())
  getAll(@Query() query: DoctorRequestDto) {
    return this.doctorService.getAll(query);
  }

  @Get('post')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  getPosts(@Query() query: PostRequestDto, @Req() req: AuthRequest) {
    return this.doctorService.getPosts(query, req.user.id, req.user.role);
  }


  @Get('time-serving')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  getTimeServing(@Req() req: AuthRequest) {
    return this.doctorService.getTimeServing(req.user.id);
  }

  @Get('working-rooms')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  getWorkingRooms(@Req() req: AuthRequest) {
    return this.doctorService.getWorkingRooms(req.user.id);
  }

  @Post('working-rooms')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  createWorkingRooms(@Req() req: AuthRequest, @Body() body: WorkingRoomsCreateDto) {
    return this.doctorService.createWorkingRooms(req.user.id, body);
  }


  @Get('time-serving/:id')
  @UsePipes(new MainValidationPipe())
  getTimeServingById(@Param('id') id: string) {
    return this.doctorService.getTimeServing(id);
  }

  @Post('time-serving')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  createTimeServing(@Req() req: AuthRequest, @Body() body: TimeServingCreateDto) {
    return this.doctorService.createTimeServing(req.user.id, body);
  }

  @Delete('time-serving')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  deleteTimeServing(@Req() req: AuthRequest, @Body() body: TimeServingDeleteDto) {
    return this.doctorService.deleteTimeServing(req.user.id, body);
  }

  @Get(':id')
  @UsePipes(new MainValidationPipe())
  getOne(@Param('id') id: string) {
    return this.doctorService.getOne(id);
  }
}
