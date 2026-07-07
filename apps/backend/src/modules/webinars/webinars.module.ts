import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Webinar } from './entities/webinar.entity';
import { WebinarsService } from './webinars.service';
import { WebinarsController } from './webinars.controller';
import { SseService } from './sse.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Webinar]), NotificationsModule],
  controllers: [WebinarsController],
  providers: [WebinarsService, SseService],
  exports: [WebinarsService, SseService],
})
export class WebinarsModule {}

