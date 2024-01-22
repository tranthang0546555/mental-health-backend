import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Role, SCHEDULE_STATUS } from '../../constants';
import { Pagination } from '../../dto';

export class PatientRegistrationDto {
  @IsString()
  @IsOptional()
  doctorId: string;

  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsOptional()
  room: string;
}

export class PatientRegistrationStatusDto extends Pagination {
  @IsIn([SCHEDULE_STATUS.PROGRESS, SCHEDULE_STATUS.COMPLETED, SCHEDULE_STATUS.CANCEL, SCHEDULE_STATUS.PENDING])
  @IsOptional()
  option: string;
}

export class VerifyDto {
  @IsNotEmpty()
  @IsIn([SCHEDULE_STATUS.CANCEL, SCHEDULE_STATUS.PROGRESS])
  status: string;

  @IsString()
  @IsOptional()
  message: string;
}

export class SetDoctorScheduleDto {
  @IsString()
  @IsNotEmpty()
  doctorId: string;
}

export class CancelScheduleDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
