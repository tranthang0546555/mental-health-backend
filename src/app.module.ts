import { DoctorModule } from './modules/doctor/doctor.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from './config';
import { PostModule } from './modules/post/post.module';
import { AuthModule } from './modules/auth/auth.module';
import { FacebookStrategy } from './modules/auth/FacebookStrategy';
import { JwtStrategy } from './modules/auth/JwtStrategy';
import { MailerModule } from '@nestjs-modules/mailer';
import { RolesGuard } from './modules/auth/RolesGuard';
import { HomeModule } from './modules/home/home.module';
import { GroupModule } from './modules/group/group.module';
import { ScheduleModule as SM } from './modules/schedule/schedule.module';
import { AppGateway } from './modules/gateway/event.gateway';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UserModule } from './modules/user/user.module';
import { CategoryModule } from './modules/category/category.module';
import { NotificationModule } from './modules/notification/notification.module';
import { RecordModule } from './modules/record/record.module';
import { TreatmentModule } from './modules/treatment/treatment.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksServiceModule } from './modules/tasks-service/tasks-service.module';

const config = ConfigService.getInstance();
@Module({
  imports: [
    MongooseModule.forRoot(config.get('DATABASE_URL'), { dbName: config.get('DATABASE_NAME') }),
    MailerModule.forRoot({
      transport: {
        host: config.get('EMAIL_SERVER'),
        auth: {
          user: config.get('EMAIL_USERNAME'),
          pass: config.get('EMAIL_PW')
        }
      }
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', './src/public')
    }),
    ScheduleModule.forRoot(),
    PostModule,
    DoctorModule,
    AuthModule,
    HomeModule,
    GroupModule,
    SM,
    UserModule,
    CategoryModule,
    NotificationModule,
    RecordModule,
    TreatmentModule,
    TasksServiceModule
  ],
  providers: [FacebookStrategy, JwtStrategy, AppGateway]
})
export class AppModule {}
