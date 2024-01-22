import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, UsePipes } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../constants';
import { Roles } from '../../decorator/roles.decorator';
import { AuthRequest, TimeLineDto } from '../../dto';
import { MainValidationPipe } from '../../utils/validate';
import { JwtGuard } from '../auth/JwtGuard';
import { parseToken } from '../auth/ParseToken';
import { RolesGuard } from '../auth/RolesGuard';
import { CommentDto, PostRequestDto } from './dto';
import { PostService } from './post.service';
@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  @UsePipes(new MainValidationPipe())
  getAll(@Query() query: PostRequestDto) {
    return this.postService.getAll(query);
  }

  @Get('deleted')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @UseGuards(JwtGuard, RolesGuard)
  @UsePipes(new MainValidationPipe())
  getPostDeleted(@Req() req: AuthRequest, @Query() query: PostRequestDto) {
    return this.postService.getPostDeleted(query, req.user.id, req.user.role);
  }

  @Get('restore/:id')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @UseGuards(JwtGuard, RolesGuard)
  restorePost(@Req() req: AuthRequest, @Param() id: string) {
    return this.postService.restorePost(id, req.user.id, req.user.role);
  }

  @Get('/chart/all')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  viewChart(@Req() req: AuthRequest, @Query() query: TimeLineDto) {
    return this.postService.viewChart(req.user.id, req.user.role, query);
  }

  @Get(':slug')
  @UsePipes(new MainValidationPipe())
  async getPost(@Param('slug') slug: string, @Req() req: Request) {
    const parse = await parseToken(req);
    return this.postService.getPost(slug, parse?.userId);
  }

  @Get('by-id/:id')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  async getPostById(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.postService.getPostById(id, req.user.id);
  }

  @Roles(Role.ADMIN, Role.DOCTOR)
  @UseGuards(JwtGuard, RolesGuard)
  @Post()
  createPost(@Req() req: AuthRequest, @Body() body: any) {
    const createdBy = req.user.id;
    return this.postService.createPost(body, createdBy);
  }

  @Roles(Role.ADMIN, Role.DOCTOR)
  @UseGuards(JwtGuard, RolesGuard)
  @Patch(':id')
  editPost(@Req() req: AuthRequest, @Body() body: any, @Param('id') id: string) {
    const updatedBy = req.user.id;
    return this.postService.editPost(id, body, updatedBy);
  }

  @Roles(Role.ADMIN, Role.DOCTOR)
  @UseGuards(JwtGuard, RolesGuard)
  @Delete(':id')
  deletePost(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.postService.deletePost(id, req.user.id, req.user.role);
  }

  @Get(':id/like')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  likePost(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.postService.likePost(id, req.user.id);
  }

  @Get(':id/bookmark')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  bookmarkPost(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.postService.bookmarkPost(id, req.user.id);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.postService.getComments(id);
  }

  @Post(':id/comments')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  newComment(@Param('id') id: string, @Req() req: AuthRequest, @Body() body: CommentDto) {
    return this.postService.newComment(id, req.user.id, body);
  }

  @Patch('/comments/:id')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  editComment(@Param('id') id: string, @Req() req: AuthRequest, @Body() body: CommentDto) {
    return this.postService.editComment(id, req.user.id, body);
  }
}
