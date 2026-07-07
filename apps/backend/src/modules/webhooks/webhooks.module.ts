import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Webhook } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Webhook, WebhookDelivery])],
  exports: [TypeOrmModule],
})
export class WebhooksModule {}
