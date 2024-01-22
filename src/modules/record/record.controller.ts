import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { Role } from '../../constants';
import { Roles } from '../../decorator/roles.decorator';
import { AuthRequest } from '../../dto';
import { MainValidationPipe } from '../../utils/validate';
import { JwtGuard } from '../auth/JwtGuard';
import { RolesGuard } from '../auth/RolesGuard';
import { CreateRecordDto, UpdateRecordDto } from './dto';
import { RecordService } from './record.service';

@Controller('record')
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @UsePipes(new MainValidationPipe())
  getAll() {
    return this.recordService.getAll();
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  getRecordById(@Param('id') id: number) {
    return this.recordService.getRecordById(id);
  }

  @Get('user/:id')
  @UseGuards(JwtGuard)
  getRecordsByUserId(@Param('id') id: string) {
    return this.recordService.getRecordsByUserId(id);
  }

  @Get('user/numberId/:id')
  @UseGuards(JwtGuard)
  getRecordsByNumberId(@Param('id') id: string) {
    return this.recordService.getRecordsByNumberId(id);
  }

  @Get('doctor/:id')
  @UseGuards(JwtGuard)
  getRecordsCreatedByDoctorId(@Param('id') id: string) {
    return this.recordService.getRecordsCreatedByDoctorId(id);
  }

  @Post()
  @Roles(Role.DOCTOR)
  @UseGuards(JwtGuard, RolesGuard)
  @UsePipes(new MainValidationPipe())
  createRecord(@Req() req: AuthRequest, @Body() body: CreateRecordDto) {
    return this.recordService.createRecord(req.user.id, body);
  }

  @Patch(':id')
  @Roles(Role.DOCTOR)
  @UseGuards(JwtGuard, RolesGuard)
  @UsePipes(new MainValidationPipe())
  updateRecord(@Param('id') id: number, @Body() body: UpdateRecordDto) {
    return this.recordService.updateRecord(id, body);
  }

  @Delete(':id')
  @Roles(Role.DOCTOR)
  @UseGuards(JwtGuard, RolesGuard)
  deleteRecord(@Param('id') id: number) {
    return this.recordService.deleteRecord(id);
  }
}
