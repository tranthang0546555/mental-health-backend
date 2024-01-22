import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { Pagination } from '../../dto';

export class DoctorCreateDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}

export class DoctorRequestDto extends Pagination {
  @IsString()
  @IsOptional()
  keyword: string;
}

export class TimeServingCreateDto {
  @IsString()
  @IsNotEmpty()
  day: string;

  @IsNumber()
  @IsNotEmpty()
  from: number;

  @IsNumber()
  @IsNotEmpty()
  to: number;

  @IsString()
  @IsNotEmpty()
  room: string;
}

export class TimeServingDeleteDto {
  @IsString()
  @IsNotEmpty()
  day: string;
}

export class WorkingRoomsCreateDto {
  @IsObject()
  workingRooms: any;
}