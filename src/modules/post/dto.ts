import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PostType } from '../../constants';
import { Pagination } from '../../dto';

export class PostRequestDto extends Pagination {
  @IsString()
  @IsOptional()
  keyword: string;

  @IsOptional()
  @IsIn([PostType.NEWEST, PostType.POPULAR, PostType.RATE])
  option: string;

  @IsString()
  @IsOptional()
  category: string;
}

export class CommentDto {
  @IsString()
  @IsOptional()
  parentId: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
