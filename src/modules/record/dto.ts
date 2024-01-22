import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateRecordDto {
  @IsString()
  @IsNotEmpty()
  medicalHistory: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  diagnostic: string;

  @IsString()
  @IsNotEmpty()
  treatment: string;
}

export class CreateRecordDto extends UpdateRecordDto {
  @IsString()
  @IsNotEmpty()
  dayIn: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  scheduleId: string;
}

