import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards, UsePipes } from '@nestjs/common';
import { Role } from '../../constants';
import { Roles } from '../../decorator/roles.decorator';
import { AuthRequest } from '../../dto';
import { MainValidationPipe } from '../../utils/validate';
import { JwtGuard } from '../auth/JwtGuard';
import { RolesGuard } from '../auth/RolesGuard';
import { CategoryService } from './category.service';
import { CategoryCreateDto } from './dto';

@Controller('category')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  @Get()
  getAll() {
    return this.categoryService.getAll();
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.categoryService.getOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @UsePipes(new MainValidationPipe())
  createCategory(@Req() req: AuthRequest, @Body() body: CategoryCreateDto) {
    return this.categoryService.create(req.user.id, body);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @UsePipes(new MainValidationPipe())
  edit(@Req() req: AuthRequest, @Body() body: CategoryCreateDto, @Param('id') id: string) {
    return this.categoryService.edit(req.user.id, id, body);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  delete(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }
}
