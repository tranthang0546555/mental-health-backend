import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream, statSync } from 'fs';
import { diskStorage } from 'multer';
import { join } from 'path';
import { generate } from 'randomstring';
import * as slugTool from 'slug';
import { Role } from '../../constants';
import { Roles } from '../../decorator/roles.decorator';
import { AuthRequest } from '../../dto';
import { MainValidationPipe } from '../../utils/validate';
import { JwtGuard } from '../auth/JwtGuard';
import { RolesGuard } from '../auth/RolesGuard';
import { UploadFileDto, UploadLinkDto } from './dto';
import { TreatmentService } from './treatment.service';

@Controller('treatment')
export class TreatmentController {
  constructor(private readonly treatmentService: TreatmentService) {}

  @Get('')
  getAll() {
    return this.treatmentService.getAll();
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @UsePipes(new MainValidationPipe())
  delete(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.treatmentService.deleteOne(req.user.id, id);
  }

  @Get('clean')
  clean() {
    return this.treatmentService.clean();
  }

  @Post('audio')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './src/public/audios',
        filename: async (_, file, cb) => {
          const name = slugTool(new Date().getTime() + generate(8));
          cb(null, name + '.' + file.originalname.split('.').pop());
        }
      }),
      fileFilter(req, file, callback) {
        const fileValid = ['audio/ogg', 'audio/mpeg'];
        if (!fileValid.includes(file.mimetype)) callback(new UnsupportedMediaTypeException('File không hợp lệ'), false);
        else callback(null, true);
      }
    })
  )
  uploadAudio(@Req() req: AuthRequest, @UploadedFile() file: Express.Multer.File, @Body() body: UploadFileDto) {
    return this.treatmentService.uploadAudio(req.user.id, file.filename, body);
  }

  @Get('audio/:filename')
  getAudio(@Res() res: Response & any, @Headers() headers, @Param('filename') filename: string) {
    const audioPath = join(process.cwd(), './src/public/audios/', filename);
    const stat = statSync(audioPath);
    const fileSize = stat.size;
    const range = headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      const file = createReadStream(audioPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mp3' // Adjust the content type as needed
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mp3' // Adjust the content type as needed
      };
      res.writeHead(200, head);
      createReadStream(audioPath).pipe(res);
    }
  }

  @Post('video')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './src/public/videos',
        filename: (_, file, cb) => {
          const name = slugTool(new Date().getTime() + generate(8));
          cb(null, name + '.' + file.originalname.split('.').pop());
        }
      }),
      fileFilter(req, file, callback) {
        const fileValid = ['video/mp4', 'video/ogg', 'video/mpeg'];
        if (!fileValid.includes(file.mimetype)) callback(new UnsupportedMediaTypeException('File không hợp lệ'), false);
        else callback(null, true);
      }
    })
  )
  uploadVideo(@Req() req: AuthRequest, @UploadedFile() file: Express.Multer.File, @Body() body: UploadFileDto) {
    return this.treatmentService.uploadVideo(req.user.id, file.filename, body);
  }

  @Get('video/:filename')
  @Header('Accept-Ranges', 'bytes')
  @Header('Content-Type', 'video/mp4')
  async getStreamVideo(@Param('filename') filename: string, @Headers() headers, @Res() res: Response & any) {
    const videoPath = `./src/public/videos/${filename}`;
    const { size } = statSync(videoPath);
    const videoRange = headers.range;
    if (videoRange) {
      const parts = videoRange.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
      const chunksize = end - start + 1;
      const readStreamfile = createReadStream(videoPath, { start, end, highWaterMark: 60 });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': chunksize
      };
      res.writeHead(HttpStatus.PARTIAL_CONTENT, head); //206
      readStreamfile.pipe(res);
    } else {
      const head = {
        'Content-Length': size
      };
      res.writeHead(HttpStatus.OK, head); //200
      createReadStream(videoPath).pipe(res);
    }
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.treatmentService.getOne(id);
  }

  @Post('link')
  @UseGuards(JwtGuard)
  @UsePipes(new MainValidationPipe())
  uploadLink(@Req() req: AuthRequest, @Body() body: UploadLinkDto) {
    return this.treatmentService.uploadLink(req.user.id, body);
  }
}
