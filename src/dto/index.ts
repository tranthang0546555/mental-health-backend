import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { TIMELINE_OPTION } from '../constants';

export class Pagination {
  @IsNumber()
  @IsOptional()
  page: number;

  @IsNumber()
  @IsOptional()
  size: number;
}

export interface AuthRequest extends Request {
  user: AuthPayload;
}

export interface AuthPayload {
  id: string;
  role: string;
}

export class TimeLineDto {
  @IsString()
  @IsIn([TIMELINE_OPTION._15D, TIMELINE_OPTION._30D, TIMELINE_OPTION._3M])
  timeline: string;
}
