import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PostType } from '../../constants';
import { Pagination } from '../../dto';

export class UserRequestDto extends Pagination {
  @IsString()
  @IsOptional()
  keyword: string;
}
export class RoleRequestDto {
  @IsString()
  @IsOptional()
  role: string;
}
