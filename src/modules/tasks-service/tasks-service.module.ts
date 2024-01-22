import { Module } from '@nestjs/common';
import { TasksServiceController } from './tasks-service.controller';

@Module({
  controllers: [TasksServiceController]
})
export class TasksServiceModule {}
